import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { Ltr } from '../../components/ui/Ltr'
import { DockerSetupExplainer } from '../../components/simulators/DockerSetupExplainer'

const dockerComposeYaml = `services:
  kafka:
    image: apache/kafka:3.8.0
    container_name: kafka-broker-1
    ports:
      - "9092:9092"
    environment:
      # شناسه یکتای این نود در کلاستر
      KAFKA_NODE_ID: 1
      # در حالت تک‌نود، بروکر هم نقش ذخیره داده و هم کنترلر KRaft را بر عهده دارد
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093
      # آدرسی که کلاینت‌ها (کدهای پایتون، جاوا یا ترمینال) برای اتصال استفاده می‌کنند
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@localhost:9093
      # برای محیط لوکال و تک‌بروکر ضریب تکثیر را ۱ می‌گذاریم
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 1
      KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS: 0
    volumes:
      - kafka_data:/var/lib/kafka/data

  # داشبورد گرافیکی تحت وب برای مشاهده تاپیک‌ها و پیام‌ها
  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    container_name: kafka-ui
    ports:
      - "8080:8080"
    environment:
      DYNAMIC_CONFIG_ENABLED: "true"
      KAFKA_CLUSTERS_0_NAME: local-cluster
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafka:9092
    depends_on:
      - kafka

volumes:
  kafka_data:`

const createTopicCli = `# ساخت تاپیک با نام orders و ۳ پارتیشن
docker exec -it kafka-broker-1 kafka-topics.sh \\
  --bootstrap-server localhost:9092 \\
  --create --topic orders \\
  --partitions 3 \\
  --replication-factor 1`

const produceCli = `# ارسال پیام تعاملی به تاپیک
docker exec -it kafka-broker-1 kafka-console-producer.sh \\
  --bootstrap-server localhost:9092 \\
  --topic orders`

const consumeCli = `# خواندن پیام‌ها از اولین پیام ثبت‌شده در تاپیک
docker exec -it kafka-broker-1 kafka-console-consumer.sh \\
  --bootstrap-server localhost:9092 \\
  --topic orders \\
  --from-beginning`

export function DockerKraftSetupContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        در گذشته، راه‌اندازی <Ltr>Kafka</Ltr> به دلیل وابستگی به ابزار جداگانه‌ای به نام{' '}
        <Ltr>ZooKeeper</Ltr> دشوار و پردردسر بود. اما از نسخه ۳٫۳ به بعد، کافکا
        معماری انقلابی <strong><Ltr>KRaft</Ltr></strong> (پروتکل اجماع داخلی Raft)
        را به شکل پایدار معرفی کرد. حالا می‌توانید در کمتر از ۳۰ ثانیه یک کلاستر کامل
        را با <Ltr>Docker Compose</Ltr> روی لپ‌تاپ خود اجرا کنید!
      </p>

      <h2>چرا ZooKeeper حذف شد و KRaft چیست؟</h2>
      <p>
        در معماری قدیمی، متادیتای کلاستر، وضعیت لیدرها و پارتیشن‌ها درون یک سیستم
        جداگانه (<Ltr>ZooKeeper</Ltr>) نگهداری می‌شد. این ساختار دو مشکل بزرگ داشت:
      </p>
      <ul>
        <li>
          <strong>پیچیدگی عملیاتی:</strong> مدیریت دو سرویس مجزا، پورت‌های دوگانه،
          تنظیمات امنیتی جداگانه و مصرف حافظه اضافی.
        </li>
        <li>
          <strong>محدودیت مقیاس:</strong> با عبور از ۲۰۰٬۰۰۰ پارتیشن، هماهنگی بین
          کافکا و زوکیپر کند می‌شد. با <Ltr>KRaft</Ltr>، کافکا می‌تواند به راحتی تا
          میلیون‌ها پارتیشن را با سرعت بازیابی آنی مدیریت کند.
        </li>
      </ul>

      <h2>فایل Docker Compose آماده برای محیط توسعه</h2>
      <p>
        یک فایل با نام <code className="font-mono text-primary-600">docker-compose.yml</code>{' '}
        در یک پوشه خالی بسازید و محتویات زیر را در آن کپی کنید. این فایل شامل ایمیج رسمی
        کافکا به همراه یک <strong>داشبورد گرافیکی زیبا (Kafka UI)</strong> روی پورت{' '}
        <Ltr className="font-mono">8080</Ltr> است:
      </p>

      <CodeBlock code={dockerComposeYaml} language="yaml" filename="docker-compose.yml" />

      <h2>قدم‌به‌قدم: از اجرای خوشه تا خواندن اولین پیام</h2>
      <p>
        پیش از اجرای واقعی روی سیستم خود، در شبیه‌ساز گام‌به‌گام زیر دستورها را به
        ترتیب جلو ببرید و خروجی هر مرحله را ببینید:
      </p>

      <DockerSetupExplainer />

      <h2>گام‌های عملی در ترمینال واقعی سیستم شما</h2>

      <h3>گام اول: اجرای کانتینرها</h3>
      <p>
        در همان پوشه‌ای که فایل <code className="font-mono">docker-compose.yml</code>{' '}
        را ذخیره کردید، دستور زیر را اجرا کنید:
      </p>
      <CodeBlock code="docker compose up -d" language="bash" filename="bash" />
      <p>
        پس از چند ثانیه، هر دو کانتینر اجرا می‌شوند. با باز کردن آدرس{' '}
        <Ltr className="font-mono">http://localhost:8080</Ltr> در مرورگر خود، داشبورد
        گرافیکی <Ltr>Kafka UI</Ltr> را مشاهده خواهید کرد.
      </p>

      <h3>گام دوم: ساخت اولین تاپیک</h3>
      <p>
        با ابزار استاندارد <code className="font-mono">kafka-topics.sh</code> یک
        تاپیک با ۳ پارتیشن بسازید:
      </p>
      <CodeBlock code={createTopicCli} language="bash" filename="create-topic.sh" />

      <h3>گام سوم: ارسال پیام (Producer)</h3>
      <p>
        با اجرای دستور زیر، پرامپت خط فرمان منتظر ورودی شما می‌ماند. چند خط متن یا{' '}
        <Ltr>JSON</Ltr> تایپ کنید و کلید اینتر را بزنید:
      </p>
      <CodeBlock code={produceCli} language="bash" filename="produce.sh" />
      <p>
        برای خروج از محیط پرودیوسر، کلیدهای <kbd className="rounded border px-1">Ctrl + C</kbd>{' '}
        را فشار دهید.
      </p>

      <h3>گام چهارم: خواندن پیام‌ها (Consumer)</h3>
      <p>
        در یک تب جدید از ترمینال، مصرف‌کننده را با فلگ{' '}
        <Ltr className="font-mono">--from-beginning</Ltr> اجرا کنید تا تمام پیام‌های
        ثبت‌شده از آغاز تاریخچه تاپیک را برای شما چاپ کند:
      </p>
      <CodeBlock code={consumeCli} language="bash" filename="consume.sh" />

      <h2>نکات مهم و خطاهای رایج هنگام نصب محلی</h2>
      <Callout variant="warning" title="اشتباه در Advertised Listeners">
        یکی از رایج‌ترین اشتباهات تازه‌کاران این است که آدرس{' '}
        <Ltr className="font-mono">KAFKA_ADVERTISED_LISTENERS</Ltr> را اشتباه تنظیم
        می‌کنند. اگر برنامه‌ای از بیرون داکر (مثلاً روی سیستم‌عامل اصلی شما) می‌خواهد
        وصل شود، باید مقدار آن <Ltr className="font-mono">localhost:9092</Ltr> باشد؛
        اما بین کانتینرهای درون داکر باید از نام سرویس (<Ltr className="font-mono">kafka:9092</Ltr>) استفاده شود.
      </Callout>

      <Callout variant="danger" title="اشغال بودن پورت ۹۰۹۲ یا ۸۰۸۰">
        اگر از قبل برنامه‌ای روی این پورت‌ها اجرا شده باشد (مثلاً یک نسخه قدیمی کافکا
        یا وب‌سرور دیگر)، داکر با خطای <Ltr>port is already allocated</Ltr> مواجه
        می‌شود. در این صورت ابتدا سرویس قبلی را متوقف کنید یا پورت سمت سیستم خود را در
        فایل کامپوز به پورت دیگری تغییر دهید.
      </Callout>

      <h2>جمع‌بندی و گام بعدی</h2>
      <p>
        حالا یک خوشه تک‌نود واقعی دارید و اولین تاپیک، پیام و مصرف‌کننده را
        دیدید. این کوچک‌ترین محیطی است که می‌توانید روی آن آزمایش کنید؛ برای
        یادگیری معماری نیازی به خوشه بزرگ نیست.
      </p>
      <ul className="font-bold text-slate-800 dark:text-slate-200">
        <li>یک بروکر با نقش ترکیبی broker و controller بالا آوردید.</li>
        <li>تاپیک orders را با سه پارتیشن ساختید.</li>
        <li>با producer و consumer یک پیام را نوشتید و خواندید.</li>
        <li>Kafka UI را برای دیدن تاپیک‌ها و پیام‌ها راه‌اندازی کردید.</li>
      </ul>
      <p className="mt-4">
        در درس بعدی با ابزارهای خط فرمان Kafka آشنا می‌شویم و همان دستورها را
        دقیق‌تر بررسی می‌کنیم؛ بعد از آن یک خوشه سه‌گانه واقعی با تحمل خرابی
        می‌سازیم.
      </p>
    </>
  )
}
