import { Callout } from '../../components/ui/Callout'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { DeepDive, DeepDiveSection } from '../../components/ui/DeepDive'
import { Ltr } from '../../components/ui/Ltr'

const clusterIdCommand = `# یک cluster id معتبر بسازید و همان را برای هر سه نود استفاده کنید
docker run --rm apache/kafka:3.8.0 \\
  /opt/kafka/bin/kafka-storage.sh random-uuid

# نمونه خروجی
# MkU3OEVBNTcwNTJENDM2Qk`

const composeFile = `services:
  kafka-1:
    image: apache/kafka:3.8.0
    container_name: kafka-1
    hostname: kafka-1
    ports:
      - "19092:19092"
    environment:
      CLUSTER_ID: "MkU3OEVBNTcwNTJENDM2Qk"
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_LISTENERS: INTERNAL://0.0.0.0:9092,EXTERNAL://0.0.0.0:19092,CONTROLLER://0.0.0.0:9093
      KAFKA_ADVERTISED_LISTENERS: INTERNAL://kafka-1:9092,EXTERNAL://localhost:19092
      KAFKA_INTER_BROKER_LISTENER_NAME: INTERNAL
      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: INTERNAL:PLAINTEXT,EXTERNAL:PLAINTEXT,CONTROLLER:PLAINTEXT
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka-1:9093,2@kafka-2:9093,3@kafka-3:9093
      KAFKA_LOG_DIRS: /var/lib/kafka/data
      KAFKA_NUM_PARTITIONS: 6
      KAFKA_DEFAULT_REPLICATION_FACTOR: 3
      KAFKA_MIN_INSYNC_REPLICAS: 2
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 3
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 3
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 2
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "false"
      KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS: 0
    volumes:
      - kafka-1-data:/var/lib/kafka/data

  kafka-2:
    image: apache/kafka:3.8.0
    container_name: kafka-2
    hostname: kafka-2
    ports:
      - "29092:29092"
    environment:
      CLUSTER_ID: "MkU3OEVBNTcwNTJENDM2Qk"
      KAFKA_NODE_ID: 2
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_LISTENERS: INTERNAL://0.0.0.0:9092,EXTERNAL://0.0.0.0:29092,CONTROLLER://0.0.0.0:9093
      KAFKA_ADVERTISED_LISTENERS: INTERNAL://kafka-2:9092,EXTERNAL://localhost:29092
      KAFKA_INTER_BROKER_LISTENER_NAME: INTERNAL
      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: INTERNAL:PLAINTEXT,EXTERNAL:PLAINTEXT,CONTROLLER:PLAINTEXT
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka-1:9093,2@kafka-2:9093,3@kafka-3:9093
      KAFKA_LOG_DIRS: /var/lib/kafka/data
      KAFKA_NUM_PARTITIONS: 6
      KAFKA_DEFAULT_REPLICATION_FACTOR: 3
      KAFKA_MIN_INSYNC_REPLICAS: 2
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 3
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 3
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 2
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "false"
      KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS: 0
    volumes:
      - kafka-2-data:/var/lib/kafka/data

  kafka-3:
    image: apache/kafka:3.8.0
    container_name: kafka-3
    hostname: kafka-3
    ports:
      - "39092:39092"
    environment:
      CLUSTER_ID: "MkU3OEVBNTcwNTJENDM2Qk"
      KAFKA_NODE_ID: 3
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_LISTENERS: INTERNAL://0.0.0.0:9092,EXTERNAL://0.0.0.0:39092,CONTROLLER://0.0.0.0:9093
      KAFKA_ADVERTISED_LISTENERS: INTERNAL://kafka-3:9092,EXTERNAL://localhost:39092
      KAFKA_INTER_BROKER_LISTENER_NAME: INTERNAL
      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: INTERNAL:PLAINTEXT,EXTERNAL:PLAINTEXT,CONTROLLER:PLAINTEXT
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka-1:9093,2@kafka-2:9093,3@kafka-3:9093
      KAFKA_LOG_DIRS: /var/lib/kafka/data
      KAFKA_NUM_PARTITIONS: 6
      KAFKA_DEFAULT_REPLICATION_FACTOR: 3
      KAFKA_MIN_INSYNC_REPLICAS: 2
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 3
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 3
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 2
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "false"
      KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS: 0
    volumes:
      - kafka-3-data:/var/lib/kafka/data

volumes:
  kafka-1-data:
  kafka-2-data:
  kafka-3-data:`

const startAndCreate = `# بالا آوردن خوشه
docker compose up -d

# دیدن وضعیت سه کانتینر
docker compose ps

# ساخت تاپیک با ۶ پارتیشن و سه replica
docker exec -it kafka-1 kafka-topics.sh \\
  --bootstrap-server localhost:9092 \\
  --create --topic orders \\
  --partitions 6 --replication-factor 3

# توصیف تاپیک
docker exec -it kafka-1 kafka-topics.sh \\
  --bootstrap-server localhost:9092 \\
  --describe --topic orders`

const describeOutput = `Topic: orders  TopicId: 4mF7g8_gT3aZ_891kL0pqw  PartitionCount: 6  ReplicationFactor: 3  Configs: min.insync.replicas=2
  Topic: orders  Partition: 0  Leader: 1  Replicas: 1,2,3  Isr: 1,2,3
  Topic: orders  Partition: 1  Leader: 2  Replicas: 2,3,1  Isr: 2,3,1
  Topic: orders  Partition: 2  Leader: 3  Replicas: 3,1,2  Isr: 3,1,2
  Topic: orders  Partition: 3  Leader: 1  Replicas: 1,2,3  Isr: 1,2,3
  Topic: orders  Partition: 4  Leader: 2  Replicas: 2,3,1  Isr: 2,3,1
  Topic: orders  Partition: 5  Leader: 3  Replicas: 3,1,2  Isr: 3,1,2`

const quorumStatus = `# وضعیت quorum کنترلرها
docker exec -it kafka-1 kafka-metadata-quorum.sh \\
  --bootstrap-server localhost:9092 describe --status

# نمونه خروجی
# ClusterId:              MkU3OEVBNTcwNTJENDM2Qk
# LeaderId:               1
# LeaderEpoch:            3
# HighWatermark:          42
# CurrentVoters:          [1, 2, 3]
# CurrentObservers:       []`

const produceAndConsume = `# نوشتن با acks=all؛ چون min.insync.replicas=2 است
docker exec -it kafka-1 kafka-console-producer.sh \\
  --bootstrap-server localhost:9092 \\
  --topic orders \\
  --producer-property acks=all

# خواندن از ابتدا در یک ترمینال دیگر
docker exec -it kafka-1 kafka-console-consumer.sh \\
  --bootstrap-server localhost:9092 \\
  --topic orders --from-beginning`

const failureTest = `# یک بروکر را متوقف کنید؛ دو بروکر و دو کنترلر باقی می‌مانند
docker compose stop kafka-2

# ISR پارتیشن‌هایی که replica روی kafka-2 داشتند، دو عضوی می‌شود
docker exec -it kafka-1 kafka-topics.sh \\
  --bootstrap-server localhost:9092 \\
  --describe --topic orders

# با min.insync.replicas=2 نوشتن acks=all هنوز موفق است
docker exec -it kafka-1 kafka-console-producer.sh \\
  --bootstrap-server localhost:9092 \\
  --topic orders --producer-property acks=all

# بروکر را برگردانید
docker compose start kafka-2`

const minIsrTest = `# min.insync.replicas را موقتاً ۳ کنید
docker exec -it kafka-1 kafka-configs.sh \\
  --bootstrap-server localhost:9092 \\
  --entity-type topics --entity-name orders \\
  --alter --add-config min.insync.replicas=3

# یک بروکر را متوقف کنید؛ ISR دو عضوی می‌شود
docker compose stop kafka-2

# حالا تولید با acks=all باید شکست بخورد
docker exec -it kafka-1 kafka-console-producer.sh \\
  --bootstrap-server localhost:9092 \\
  --topic orders --producer-property acks=all

# خطای مورد انتظار
# org.apache.kafka.common.errors.NotEnoughReplicasException:
# Messages are rejected since there are fewer in-sync replicas than required.

# برگرداندن تنظیم و بروکر
docker exec -it kafka-1 kafka-configs.sh \\
  --bootstrap-server localhost:9092 \\
  --entity-type topics --entity-name orders \\
  --alter --delete-config min.insync.replicas

docker compose start kafka-2`

const dedicatedController = `# نمونه کنترلر اختصاصی: فقط نقش controller
KAFKA_NODE_ID: 4
KAFKA_PROCESS_ROLES: controller
KAFKA_LISTENERS: CONTROLLER://0.0.0.0:9093
KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
KAFKA_CONTROLLER_QUORUM_VOTERS: 4@controller-1:9093,5@controller-2:9093,6@controller-3:9093
KAFKA_LOG_DIRS: /var/lib/kafka/data

# و بروکرها فقط نقش broker دارند و به همان quorum اشاره می‌کنند
KAFKA_PROCESS_ROLES: broker
KAFKA_CONTROLLER_QUORUM_VOTERS: 4@controller-1:9093,5@controller-2:9093,6@controller-3:9093`

export function DockerThreeNodeContent() {
  return (
    <>
      <p className="text-base font-medium leading-8 text-slate-800 dark:text-slate-200">
        در درس نصب سریع، یک نود تنها کافی بود تا با کافکا آشنا شویم. اما تک‌نود
        هیچ‌کدام از وعده‌های اصلی کافکا را نشان نمی‌دهد: تکرار داده، تحمل خرابی
        بروکر و انتخاب رهبر. در این درس یک خوشه واقعی <Ltr>KRaft</Ltr> با سه نود
        می‌سازیم؛ هر نود هم نقش <Ltr>broker</Ltr> دارد و هم <Ltr>controller</Ltr>،
        با ذخیره‌سازی پایدار و دو listener جدا برای کلاینت‌های داخل و بیرون داکر.
      </p>

      <Callout variant="info" title="چرا سه نود؟">
        با سه نود می‌توانید <Ltr>replication factor</Ltr> را ۳ بگذارید و{' '}
        <Ltr>min.insync.replicas</Ltr> را ۲. در این حالت با از دست رفتن یک بروکر،
        نوشتن با <Ltr>acks=all</Ltr> ادامه پیدا می‌کند. سه کنترلر هم اکثریت لازم
        برای <Ltr>quorum</Ltr> را می‌سازند: دو نود از سه نود کافی است.
      </Callout>

      <h2>۱. معماری این خوشه</h2>
      <p>
        هر نود یک شناسه یکتا (<Ltr>node.id</Ltr>) دارد و هر سه در یک{' '}
        <Ltr>cluster id</Ltr> مشترک عضو هستند. listenerها را جدا می‌کنیم:
      </p>
      <table>
        <thead>
          <tr>
            <th>Listener</th>
            <th>پورت</th>
            <th>برای چه کسی؟</th>
            <th>آدرس advertised</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <Ltr>INTERNAL</Ltr>
            </td>
            <td>9092</td>
            <td>ارتباط بروکرها با هم و کلاینت‌های داخل شبکه داکر</td>
            <td>
              <Ltr>kafka-1:9092</Ltr>
            </td>
          </tr>
          <tr>
            <td>
              <Ltr>EXTERNAL</Ltr>
            </td>
            <td>19092 / 29092 / 39092</td>
            <td>کلاینت‌هایی که روی سیستم میزبان اجرا می‌شوند</td>
            <td>
              <Ltr>localhost:19092</Ltr>
            </td>
          </tr>
          <tr>
            <td>
              <Ltr>CONTROLLER</Ltr>
            </td>
            <td>9093</td>
            <td>رأی‌گیری و متادیتای KRaft</td>
            <td>داخلی؛ کلاینت‌ها به آن وصل نمی‌شوند</td>
          </tr>
        </tbody>
      </table>
      <p>
        نکته مهم این است که <Ltr>advertised.listeners</Ltr> آدرسی است که بروکر به
        کلاینت برمی‌گرداند، نه آدرسی که روی آن گوش می‌دهد. اگر داخل داکر آدرس{' '}
        <Ltr>localhost:9092</Ltr> را advertise کنید، کلاینت داخل کانتینر دیگر
        نمی‌تواند به بروکرهای دیگر وصل شود.
      </p>

      <h2>۲. ساخت cluster id</h2>
      <p>
        هر سه نود باید دقیقاً یک <Ltr>cluster id</Ltr> داشته باشند. یک شناسه
        تصادفی بسازید و در فایل Compose قرار دهید:
      </p>
      <CodeBlock code={clusterIdCommand} language="bash" filename="cluster-id.sh" />

      <h2>۳. فایل کامل Docker Compose</h2>
      <p>
        فایل زیر سه سرویس دارد. پورت‌های بیرونی را عمداً ۱۹۰۹۲، ۲۹۰۹۲ و ۳۹۰۹۲
        گذاشتیم تا با کافکای محلی یا نمونه‌های قبلی روی پورت ۹۰۹۲ تداخل نکنند.
        هر نود volume مخصوص خودش را دارد تا داده بعد از restart باقی بماند.
      </p>
      <CodeBlock code={composeFile} language="yaml" filename="docker-compose.yml" />

      <h2>۴. بالا آوردن خوشه و ساخت تاپیک</h2>
      <p>
        بعد از اجرای Compose، اول وضعیت کانتینرها را ببینید و بعد یک تاپیک با
        ضریب تکثیر ۳ بسازید. اگر یکی از نودها بالا نیامده باشد، ساخت تاپیک با
        خطای <Ltr>replication factor larger than available brokers</Ltr> شکست
        می‌خورد:
      </p>
      <CodeBlock code={startAndCreate} language="bash" filename="start.sh" />
      <p>
        در خروجی <Ltr>--describe</Ltr> باید ببینید رهبر پارتیشن‌ها بین سه بروکر
        می‌چرخد و <Ltr>Isr</Ltr> هر سه عضو را دارد:
      </p>
      <CodeBlock code={describeOutput} language="text" filename="describe-output.txt" />

      <h2>۵. دیدن quorum کنترلرها</h2>
      <p>
        در <Ltr>KRaft</Ltr> کنترلرها با پروتکل <Ltr>Raft</Ltr> روی متادیتا توافق
        می‌کنند. ابزار <Ltr>kafka-metadata-quorum.sh</Ltr> نشان می‌دهد چه کسی
        رهبر quorum است و چه نودهایی رأی‌دهنده‌اند:
      </p>
      <CodeBlock code={quorumStatus} language="bash" filename="quorum-status.sh" />
      <p>
        در <Ltr>CurrentVoters</Ltr> باید هر سه شناسه <Ltr>1</Ltr>،{' '}
        <Ltr>2</Ltr> و <Ltr>3</Ltr> را ببینید. اگر یکی از آن‌ها نیست، تنظیم{' '}
        <Ltr>KAFKA_CONTROLLER_QUORUM_VOTERS</Ltr> در آن نود اشتباه است.
      </p>

      <h2>۶. آزمون نوشتن و خواندن</h2>
      <p>
        با <Ltr>acks=all</Ltr> تولید کنید و در ترمینال دیگری بخوانید. چون{' '}
        <Ltr>min.insync.replicas=2</Ltr> است، نوشتن باید تا وقتی حداقل دو نسخه
        همگام وجود دارد موفق باشد:
      </p>
      <CodeBlock code={produceAndConsume} language="bash" filename="produce-consume.sh" />

      <h2>۷. آزمون خرابی: یک بروکر را خاموش کنید</h2>
      <p>
        یکی از بروکرها را متوقف کنید. دو بروکر و دو کنترلر باقی می‌مانند؛ یعنی
        quorum هنوز اکثریت دارد. پارتیشن‌هایی که replica روی بروکر خاموش داشتند،
        یک عضو کمتر در <Ltr>ISR</Ltr> نشان می‌دهند، اما نوشتن با{' '}
        <Ltr>acks=all</Ltr> و <Ltr>min.insync.replicas=2</Ltr> ادامه پیدا می‌کند:
      </p>
      <CodeBlock code={failureTest} language="bash" filename="failure-test.sh" />
      <Callout variant="warning" title="دو بروکر خاموش یعنی از دست رفتن quorum">
        اگر دو نود از سه نود را خاموش کنید، اکثریت کنترلرها از بین می‌رود و خوشه
        نمی‌تواند متادیتا را تغییر دهد. در این وضعیت حتی اگر یک بروکر زنده باشد،
        نوشتن و انتخاب رهبر جدید ممکن نیست. تحمل خرابی سه نود، فقط یک خرابی است.
      </Callout>

      <h2>۸. آزمون min.insync.replicas</h2>
      <p>
        برای دیدن تفاوت <Ltr>acks=all</Ltr> با <Ltr>min.insync.replicas</Ltr>،
        مقدار min ISR را موقتاً ۳ کنید و یک بروکر را خاموش کنید. حالا دو نسخه
        همگام داریم، اما حداقل لازم سه است؛ پس تولیدکننده خطای{' '}
        <Ltr>NotEnoughReplicasException</Ltr> می‌گیرد:
      </p>
      <CodeBlock code={minIsrTest} language="bash" filename="min-isr-test.sh" />
      <p>
        این آزمون نشان می‌دهد چرا <Ltr>acks=all</Ltr> به‌تنهایی دوام را تضمین
        نمی‌کند: اگر <Ltr>min.insync.replicas</Ltr> پایین باشد، نوشتن با یک نسخه
        همگام هم موفق می‌شود و آن یک نسخه ممکن است همان بروکری باشد که در حال
        خاموش شدن است.
      </p>

      <DeepDive title="جزئیات عملیاتی: حالت کنترلر اختصاصی و اکثریت">
        <DeepDiveSection title="combined در برابر isolated">
          <p>
            در فایل بالا هر نود هم بروکر است و هم کنترلر. این حالت برای توسعه و
            خوشه‌های کوچک ساده‌تر است. در محیط عملیاتی بزرگ‌تر، معمولاً کنترلرها
            را از بروکرها جدا می‌کنند تا بار رأی‌گیری و متادیتا با بار داده قاطی
            نشود. در آن حالت، نودهای کنترلر فقط{' '}
            <Ltr>KAFKA_PROCESS_ROLES=controller</Ltr> دارند و بروکرها فقط{' '}
            <Ltr>broker</Ltr>.
          </p>
          <CodeBlock
            code={dedicatedController}
            language="yaml"
            filename="dedicated-controller.yml"
          />
        </DeepDiveSection>
        <DeepDiveSection title="چرا تعداد فرد؟">
          <p>
            <Ltr>Raft</Ltr> برای تصمیم‌گیری به اکثریت نیاز دارد. با سه نود،
            اکثریت دو نود است و تحمل یک خرابی دارید. با چهار نود، اکثریت سه نود
            است و باز هم فقط یک خرابی را تحمل می‌کنید؛ پس چهار نود فقط هزینه
            بیشتری دارد. برای خوشه‌های بزرگ‌تر، پنج کنترلر تحمل دو خرابی می‌دهد.
          </p>
        </DeepDiveSection>
        <DeepDiveSection title="این Compose برای تولید نیست">
          <p>
            این فایل نه <Ltr>TLS</Ltr> دارد، نه <Ltr>SASL</Ltr>، نه محدودیت منابع
            و نه مانیتورینگ. برای محیط عملیاتی حداقل باید احراز هویت و رمزنگاری
            اضافه شود، از image با نسخه ثابت استفاده شود، volumeها روی دیسک
            پایدار باشند و هشدار برای <Ltr>under-replicated partitions</Ltr>{' '}
            تنظیم شود.
          </p>
        </DeepDiveSection>
      </DeepDive>

      <h2>اشتباه‌های رایج</h2>
      <Callout variant="danger" title="cluster id متفاوت در هر نود">
        اگر هر نود <Ltr>CLUSTER_ID</Ltr> جداگانه داشته باشد، خوشه تشکیل نمی‌شود و
        در لاگ خطای <Ltr>Inconsistent cluster ID</Ltr> می‌بینید. یک شناسه بسازید
        و در هر سه سرویس همان را بگذارید.
      </Callout>
      <Callout variant="danger" title="advertise کردن localhost داخل داکر">
        اگر <Ltr>KAFKA_ADVERTISED_LISTENERS</Ltr> را برای listener داخلی{' '}
        <Ltr>localhost:9092</Ltr> بگذارید، بروکر اول به کلاینت می‌گوید «بروکر بعدی
        روی localhost است» و کلاینت داخل کانتینر دیگر به آن نمی‌رسد. برای ارتباط
        داخلی از نام سرویس (<Ltr>kafka-1:9092</Ltr>) استفاده کنید.
      </Callout>
      <Callout variant="warning" title="فقط یک پورت بیرونی باز کردن">
        اگر فقط پورت <Ltr>kafka-1</Ltr> را به میزبان expose کنید، اتصال اول موفق
        می‌شود اما متادیتا آدرس بروکرهای ۲ و ۳ را برمی‌گرداند که از بیرون قابل
        دسترسی نیستند. هر سه listener بیرونی باید پورت مخصوص خودش را داشته باشد.
      </Callout>
      <Callout variant="warning" title="ضریب تکثیر ۱ برای تاپیک‌های داخلی">
        تاپیک <Ltr>__consumer_offsets</Ltr> و <Ltr>__transaction_state</Ltr> هم
        باید تکرار شوند. اگر <Ltr>KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR</Ltr> را
        روی ۱ بگذارید، آفست گروه‌ها فقط روی یک بروکر می‌نشیند و با خاموش شدن آن
        بروکر، پیشرفت مصرف‌کننده‌ها در خطر می‌افتد.
      </Callout>
      <Callout variant="info" title="image با تگ latest">
        برای آموزش استفاده از <Ltr>latest</Ltr> وسوسه‌انگیز است، اما رفتار خوشه
        بین نسخه‌ها تغییر می‌کند. همیشه یک نسخه ثابت مثل{' '}
        <Ltr>apache/kafka:3.8.0</Ltr> را pin کنید تا آموزش شما با آپدیت ناگهانی
        نشکند.
      </Callout>

      <h2>جمع‌بندی</h2>
      <ul className="rounded-xl bg-slate-100 p-4 font-bold text-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
        <li>
          سه نود با <Ltr>replication factor=3</Ltr> و{' '}
          <Ltr>min.insync.replicas=2</Ltr> تحمل یک خرابی بروکر را می‌دهد.
        </li>
        <li>
          هر نود یک <Ltr>node.id</Ltr> یکتا و یک <Ltr>cluster id</Ltr> مشترک
          دارد.
        </li>
        <li>
          listener داخلی و بیرونی را جدا کنید و آدرس advertise را درست بگذارید.
        </li>
        <li>
          <Ltr>CurrentVoters</Ltr> در quorum باید هر سه کنترلر را نشان دهد.
        </li>
        <li>
          با خاموش شدن یک بروکر، <Ltr>ISR</Ltr> کوچک می‌شود اما نوشتن با{' '}
          <Ltr>acks=all</Ltr> ادامه دارد.
        </li>
        <li>
          این Compose برای توسعه است؛ برای تولید به امنیت، پایش و منابع پایدار
          نیاز دارید.
        </li>
      </ul>
      <p>
        خوشه سه‌گانه آماده است. در درس بعد سراغ مدیریت تاپیک‌ها می‌رویم: تغییر
        تعداد پارتیشن، تنظیم retention و حذف امن تاپیک روی همین خوشه.
      </p>
    </>
  )
}
