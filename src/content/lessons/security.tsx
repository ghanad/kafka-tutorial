import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'

const listenersConfig = `# server.properties — چند شنونده با کاربرد متفاوت
listeners=PLAINTEXT://:9092,SSL://:9093,SASL_SSL://:9094
advertised.listeners=PLAINTEXT://broker-1:9092,SSL://broker-1:9093,SASL_SSL://broker-1:9094
security.inter.broker.protocol=SSL

ssl.keystore.location=/etc/kafka/ssl/broker-1.keystore.jks
ssl.keystore.password=changeit
ssl.key.password=changeit
ssl.truststore.location=/etc/kafka/ssl/broker-1.truststore.jks
ssl.truststore.password=changeit
ssl.client.auth=none`

const saslConfig = `# server.properties — احراز هویت بین بروکرها با SCRAM
security.inter.broker.protocol=SASL_SSL
sasl.enabled.mechanisms=SCRAM-SHA-512
sasl.mechanism.inter.broker.protocol=SCRAM-SHA-512

listener.name.sasl_ssl.scram-sha-512.sasl.jaas.config=org.apache.kafka.common.security.scram.ScramLoginModule required \\
  username="broker-1" password="broker-secret";`

const clientConfig = `# client.properties — اتصال امن از سمت برنامه
security.protocol=SASL_SSL
sasl.mechanism=SCRAM-SHA-512
sasl.jaas.config=org.apache.kafka.common.security.scram.ScramLoginModule required \\
  username="orders-app" password="orders-secret";
ssl.truststore.location=/etc/kafka/client.truststore.jks
ssl.truststore.password=changeit`

const scramUser = `# ساخت کاربر SCRAM و تعیین رمز
kafka-configs.sh --bootstrap-server broker-1:9094 --command-config client.properties \\
  --alter --add-config 'SCRAM-SHA-512=[password=orders-secret]' \\
  --entity-type users --entity-name orders-app`

const authorizerConfig = `# server.properties
authorizer.class.name=org.apache.kafka.metadata.authorizer.StandardAuthorizer
allow.everyone.if.no.acl.found=false
super.users=User:admin;User:kafka-controller`

const aclCommands = `# تولیدکننده فقط اجازه نوشتن روی تاپیک orders را دارد
kafka-acls.sh --bootstrap-server broker-1:9094 --command-config client.properties \\
  --add --allow-principal User:orders-app --operation Write --topic orders

# مصرف‌کننده به خواندن تاپیک و عضویت در گروه billing نیاز دارد
kafka-acls.sh --bootstrap-server broker-1:9094 --command-config client.properties \\
  --add --allow-principal User:billing-app --operation Read --topic orders

kafka-acls.sh --bootstrap-server broker-1:9094 --command-config client.properties \\
  --add --allow-principal User:billing-app --operation Read --group billing

# دیدن ACLهای یک تاپیک
kafka-acls.sh --bootstrap-server broker-1:9094 --command-config client.properties \\
  --list --topic orders`

export function SecurityContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        تا اینجا خوشه را ساختیم، تاپیک‌ها را مدیریت کردیم و ابزارها را شناختیم.
        اما در همه این درس‌ها هر کسی که به پورت بروکر دسترسی داشت می‌توانست
        همه‌چیز را بخواند و بنویسد. در محیط واقعی این یعنی یک اشتباه کوچک در
        شبکه، فاش شدن داده مشتریان است. امنیت کافکا از چهار لایه ساخته می‌شود:
        رمزنگاری ارتباط، احراز هویت، کنترل دسترسی و سخت‌سازی خود خوشه.
      </p>

      <Callout variant="info" title="امنیت یک تنظیم نیست، یک زنجیر است">
        اگر <Ltr>TLS</Ltr> را روشن کنید اما <Ltr>ACL</Ltr> نداشته باشید، هر
        کاربر احراز هویت‌شده به همه تاپیک‌ها دسترسی دارد. اگر <Ltr>ACL</Ltr>{' '}
        بگذارید اما ارتباط بین بروکرها بدون رمزنگاری باشد، مهاجم داخل شبکه
        می‌تواند داده را ببیند. هر لایه باید کامل باشد.
      </Callout>

      <h2>۱. چهار لایه امنیت</h2>
      <p>
        قبل از نوشتن کانفیگ، مشخص کنید هر لایه چه سؤالی را جواب می‌دهد. این
        جدول نقشه راه درس است:
      </p>
      <table>
        <thead>
          <tr>
            <th>لایه</th>
            <th>سؤال</th>
            <th>ابزار کافکا</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>رمزنگاری ارتباط</td>
            <td>آیا کسی می‌تواند داده را روی شبکه بخواند؟</td>
            <td><Ltr>SSL/TLS</Ltr></td>
          </tr>
          <tr>
            <td>احراز هویت</td>
            <td>این اتصال واقعاً از طرف چه کسی است؟</td>
            <td><Ltr>SASL</Ltr> یا <Ltr>mTLS</Ltr></td>
          </tr>
          <tr>
            <td>کنترل دسترسی</td>
            <td>این کاربر اجازه چه کاری را دارد؟</td>
            <td><Ltr>ACL</Ltr> و <Ltr>Authorizer</Ltr></td>
          </tr>
          <tr>
            <td>سخت‌سازی</td>
            <td>آیا سطح حمله غیرضروری بسته است؟</td>
            <td>شبکه، <Ltr>JMX</Ltr>، حساب‌ها، پایش</td>
          </tr>
        </tbody>
      </table>

      <h2>۲. رمزنگاری ارتباط با TLS</h2>
      <p>
        <Ltr>TLS</Ltr> سه چیز می‌دهد: محرمانگی داده روی شبکه، تشخیص دستکاری و
        احراز هویت سرور. در حالت رایج، کلاینت گواهی بروکر را با{' '}
        <Ltr>truststore</Ltr> بررسی می‌کند و بروکر کلید خصوصی خود را از{' '}
        <Ltr>keystore</Ltr> می‌خواند. اگر بخواهید بروکر هم کلاینت را با گواهی
        بشناسد، <Ltr>ssl.client.auth=required</Ltr> را روشن می‌کنید که به آن{' '}
        <Ltr>mTLS</Ltr> می‌گویند.
      </p>
      <p>
        معمولاً چند شنونده جدا تعریف می‌کنیم: یکی برای ارتباط داخلی بروکرها، یکی
        برای برنامه‌ها و یکی فقط برای عیب‌یابی موقت. نکته حیاتی این است که
        ارتباط بین بروکرها هم رمزنگاری شود؛ در غیر این صورت داده تکرارشده روی
        شبکه داخلی قابل شنود است.
      </p>
      <CodeBlock code={listenersConfig} language="properties" filename="server.properties" />
      <Callout variant="warning" title="advertised.listeners را فراموش نکنید">
        کلاینت بعد از اولین اتصال، آدرس بروکرها را از متادیتا می‌گیرد. اگر{' '}
        <Ltr>advertised.listeners</Ltr> آدرس اشتباه یا پورت بدون <Ltr>TLS</Ltr>{' '}
        بدهد، اتصال اول موفق می‌شود و درخواست بعدی شکست می‌خورد. این خطا در
        خوشه‌های داکری و پشت <Ltr>NAT</Ltr> بسیار رایج است.
      </Callout>

      <h2>۳. احراز هویت با SASL</h2>
      <p>
        <Ltr>TLS</Ltr> می‌گوید با چه سروری حرف می‌زنید؛ <Ltr>SASL</Ltr> می‌گوید
        شما چه کسی هستید. چهار مکانیزم رایج داریم:
      </p>
      <table>
        <thead>
          <tr>
            <th>مکانیزم</th>
            <th>مناسب برای</th>
            <th>نکته</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><Ltr>PLAIN</Ltr></td>
            <td>آزمایش و محیط داخلی</td>
            <td>رمز را خام می‌فرستد؛ فقط روی <Ltr>TLS</Ltr> قابل قبول است</td>
          </tr>
          <tr>
            <td><Ltr>SCRAM-SHA-256/512</Ltr></td>
            <td>اکثر محیط‌های تولید</td>
            <td>چالش-پاسخ با نمک؛ رمز در متادیتا ذخیره می‌شود</td>
          </tr>
          <tr>
            <td><Ltr>GSSAPI</Ltr></td>
            <td>سازمان‌هایی با <Ltr>Kerberos</Ltr></td>
            <td>مدیریت متمرکز هویت، راه‌اندازی پیچیده‌تر</td>
          </tr>
          <tr>
            <td><Ltr>OAUTHBEARER</Ltr></td>
            <td>توکن و <Ltr>SSO</Ltr></td>
            <td>نیازمند سرور توکن و هماهنگی با <Ltr>IdP</Ltr></td>
          </tr>
        </tbody>
      </table>
      <p>
        برای بیشتر تیم‌ها، <Ltr>SASL_SSL</Ltr> با <Ltr>SCRAM-SHA-512</Ltr> نقطه
        شروع خوبی است: رمزنگاری و احراز هویت با هم، بدون نیاز به زیرساخت{' '}
        <Ltr>Kerberos</Ltr>. کاربر را با <Ltr>kafka-configs.sh</Ltr> می‌سازید و
        بروکرها هم با همان مکانیزم با هم صحبت می‌کنند.
      </p>
      <CodeBlock code={saslConfig} language="properties" filename="server.properties" />
      <CodeBlock code={scramUser} language="bash" filename="create-scram-user.sh" />
      <CodeBlock code={clientConfig} language="properties" filename="client.properties" />
      <Callout variant="danger" title="PLAIN بدون TLS">
        <Ltr>PLAIN</Ltr> رمز عبور را تقریباً خام روی شبکه می‌فرستد. اگر آن را با{' '}
        <Ltr>SASL_PLAINTEXT</Ltr> ترکیب کنید، هر کسی که ترافیک را ببیند رمز را
        دارد. یا <Ltr>SASL_SSL</Ltr> انتخاب کنید یا از <Ltr>SCRAM</Ltr> استفاده
        کنید.
      </Callout>

      <h2>۴. کنترل دسترسی با ACL</h2>
      <p>
        بعد از احراز هویت، کافکا می‌داند نام اصلی شما چیست؛ مثلاً{' '}
        <Ltr>User:orders-app</Ltr>. حالا باید بگویید این کاربر روی کدام منبع چه
        عملیاتی انجام دهد. هر <Ltr>ACL</Ltr> از سه بخش ساخته می‌شود: اصلی
        (<Ltr>Principal</Ltr>)، منبع (<Ltr>Resource</Ltr>) و عملیات (
        <Ltr>Operation</Ltr>). مجوز می‌تواند <Ltr>allow</Ltr> یا{' '}
        <Ltr>deny</Ltr> باشد و <Ltr>deny</Ltr> همیشه برنده است.
      </p>
      <CodeBlock code={authorizerConfig} language="properties" filename="server.properties" />
      <p>
        منبع می‌تواند <Ltr>Topic</Ltr>، <Ltr>Group</Ltr>، <Ltr>Cluster</Ltr>،{' '}
        <Ltr>TransactionalId</Ltr> یا <Ltr>DelegationToken</Ltr> باشد. عملیات
        هم شامل <Ltr>Read</Ltr>، <Ltr>Write</Ltr>، <Ltr>Create</Ltr>،{' '}
        <Ltr>Delete</Ltr>، <Ltr>Alter</Ltr>، <Ltr>Describe</Ltr> و{' '}
        <Ltr>All</Ltr> است. برای یک مصرف‌کننده، فقط <Ltr>Read</Ltr> روی تاپیک
        کافی نیست؛ باید روی گروه هم <Ltr>Read</Ltr> داشته باشد.
      </p>
      <CodeBlock code={aclCommands} language="bash" filename="acl-orders.sh" />
      <p>
        برای تولیدکننده، <Ltr>Write</Ltr> روی تاپیک و اگر تراکنش استفاده می‌کند{' '}
        <Ltr>Write</Ltr> روی <Ltr>TransactionalId</Ltr> لازم است. برای مدیریت
        خوشه، <Ltr>Describe</Ltr> روی <Ltr>Cluster</Ltr> و برای ساخت تاپیک{' '}
        <Ltr>Create</Ltr> روی <Ltr>Cluster</Ltr> لازم می‌شود. اصل کمترین
        اختیار را رعایت کنید: هر برنامه فقط همان چیزی را بگیرد که لازم دارد.
      </p>
      <Callout variant="warning" title="ACL گروه را جا نیندازید">
        خطای <Ltr>GROUP_AUTHORIZATION_FAILED</Ltr> تقریباً همیشه یعنی مجوز گروه
        داده نشده است. مصرف‌کننده تا وقتی نتواند در گروه عضو شود، حتی با مجوز
        خواندن تاپیک هم کار نمی‌کند.
      </Callout>

      <h2>۵. چک‌لیست امن‌سازی خوشه</h2>
      <ol>
        <li>
          همه شنونده‌های تولیدی را <Ltr>SASL_SSL</Ltr> یا <Ltr>SSL</Ltr> کنید و
          <Ltr>PLAINTEXT</Ltr> را فقط برای شبکه ایزوله نگه دارید.
        </li>
        <li>
          <Ltr>security.inter.broker.protocol</Ltr> را هم امن کنید.
        </li>
        <li>
          برای هر برنامه یک هویت جدا بسازید؛ حساب مشترک بین چند سرویس، ردیابی و
          لغو دسترسی را سخت می‌کند.
        </li>
        <li>
          <Ltr>allow.everyone.if.no.acl.found=false</Ltr> را نگه دارید تا نبود
          <Ltr>ACL</Ltr> به معنی «همه‌چیز مجاز» نباشد.
        </li>
        <li>
          <Ltr>super.users</Ltr> را خیلی کوتاه نگه دارید و فقط برای کنترلر و
          حساب عملیاتی اضطراری استفاده کنید.
        </li>
        <li>
          پورت <Ltr>JMX</Ltr> و <Ltr>REST Proxy</Ltr> را در شبکه عمومی باز
          نگذارید؛ اینها اغلب از یاد می‌روند.
        </li>
        <li>
          چرخش گواهی و رمز را از قبل تمرین کنید؛ گواهی منقضی شده کل خوشه را از
          دسترس خارج می‌کند.
        </li>
      </ol>

      <DeepDive title="جزئیات پیاده‌سازی امنیت در کافکا">
        <DeepDiveSection title="mTLS در برابر TLS یک‌طرفه">
          <p>
            در <Ltr>TLS</Ltr> یک‌طرفه فقط کلاینت هویت بروکر را بررسی می‌کند. در{' '}
            <Ltr>mTLS</Ltr> بروکر هم گواهی کلاینت را می‌خواهد و نام اصلی کاربر از
            گواهی استخراج می‌شود. <Ltr>mTLS</Ltr> برای احراز هویت ماشین‌به‌ماشین
            عالی است، اما چرخش گواهی برای هزاران کلاینت می‌تواند سنگین شود.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="نام اصلی و super.users">
          <p>
            نام اصلی در <Ltr>SASL</Ltr> از مکانیزم می‌آید و در <Ltr>mTLS</Ltr> از
            گواهی. در <Ltr>ACL</Ltr>ها همیشه با پیشوند <Ltr>User:</Ltr> نوشته
            می‌شود. <Ltr>super.users</Ltr> از همه <Ltr>ACL</Ltr>ها عبور می‌کند،
            پس اگر یک برنامه را اشتباهی آنجا بگذارید، کنترل دسترسی آن بی‌اثر
            می‌شود.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="کش ACL و زمان اعمال تغییر">
          <p>
            کافکا <Ltr>ACL</Ltr>ها را در حافظه کش می‌کند و تغییرات از طریق
            کنترلر به بروکرها می‌رسد. معمولاً چند ثانیه طول می‌کشد. اگر بعد از
            افزودن <Ltr>ACL</Ltr> هنوز خطای مجوز می‌گیرید، اول چند ثانیه صبر
            کنید و بعد دنبال اشتباه در نام اصلی یا نوع منبع بگردید.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="محدودیت نرخ به‌عنوان لایه تکمیلی">
          <p>
            <Ltr>Quota</Ltr> جلوی یک کلاینت پرمصرف را می‌گیرد و از بقیه خوشه
            محافظت می‌کند. این ابزار امنیتی نیست، اما در کنار <Ltr>ACL</Ltr> از
            حملات ساده و اشتباهات برنامه‌نویسی هم محافظت می‌کند. برای هر کلاینت
            می‌توانید <Ltr>producer_byte_rate</Ltr> و{' '}
            <Ltr>consumer_byte_rate</Ltr> تعیین کنید.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="رمزنگاری فقط روی شنونده کلاینت">
        اگر <Ltr>listeners</Ltr> شامل <Ltr>SASL_SSL</Ltr> باشد اما{' '}
        <Ltr>security.inter.broker.protocol=PLAINTEXT</Ltr> بماند، داده تکرارشده
        بین بروکرها بدون رمزنگاری منتقل می‌شود. هر دو مسیر را امن کنید.
      </Callout>
      <Callout variant="danger" title="allow.everyone.if.no.acl.found=true">
        این تنظیم برای راه‌اندازی اولیه راحت است، اما اگر در تولید بماند، هر
        منبعی که <Ltr>ACL</Ltr> ندارد برای همه باز است. آن را خاموش کنید و
        مجوزها را صریح بدهید.
      </Callout>
      <Callout variant="warning" title="JMX و REST Proxy بدون محافظ">
        پورت <Ltr>JMX</Ltr> دسترسی کامل به متریک‌ها و گاهی عملیات مدیریتی می‌دهد.
        آن را روی شبکه داخلی محدود کنید، احراز هویت بگذارید یا از{' '}
        <Ltr>JMX Exporter</Ltr> استفاده کنید. <Ltr>REST Proxy</Ltr> هم دقیقاً
        مثل یک کلاینت کافکا باید پشت احراز هویت باشد.
      </Callout>
      <Callout variant="warning" title="یک حساب مشترک برای همه سرویس‌ها">
        وقتی همه برنامه‌ها با کاربر <Ltr>admin</Ltr> وصل شوند، نمی‌فهمید کدام
        سرویس داده را خوانده و لغو دسترسی یک سرویس یعنی قطع همه. برای هر سرویس
        هویت جدا بسازید.
      </Callout>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>امنیت چهار لایه دارد: رمزنگاری، احراز هویت، کنترل دسترسی و سخت‌سازی.</li>
        <li><Ltr>SASL_SSL</Ltr> با <Ltr>SCRAM-SHA-512</Ltr> نقطه شروع عملی است.</li>
        <li>ارتباط بین بروکرها را هم رمزنگاری و احراز هویت کنید.</li>
        <li>برای مصرف‌کننده، مجوز تاپیک و گروه هر دو لازم است.</li>
        <li><Ltr>allow.everyone.if.no.acl.found=false</Ltr> و <Ltr>super.users</Ltr> کوتاه را جدی بگیرید.</li>
        <li>چرخش گواهی، پایش و حساب‌های جدا بخشی از طراحی‌اند.</li>
      </ul>
      <p>
        با این درس، لایه امنیتی خوشه را می‌شناسید. در درس بعدی سراغ پایش
        می‌رویم: از کجا بفهمیم خوشه سالم است، کدام متریک‌ها را هشدار کنیم و
        چطور lag مصرف‌کننده را درست تفسیر کنیم.
      </p>
    </>
  )
}
