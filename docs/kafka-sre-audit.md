# ممیزی دورهٔ Kafka از دید DevOps/SRE

هدف این سند این است که کل دورهٔ Kafka را با یک معیار بسنجد: «آیا این درس به
اپراتور کمک می‌کند خوشه را راه‌اندازی، پیکربندی، پایش، عیب‌یابی و مقیاس‌پذیر
کند؟» وجود کد به‌خودی‌خود ایراد نیست؛ ایراد وقتی است که درس از زاویهٔ
برنامه‌نویس اپلیکیشن نوشته شده باشد و سؤال عملیاتی را کنار بگذارد.

## راهنمای برچسب‌ها

- `SRE-ready`: محتوا از قبل عملیاتی است؛ حداکثر یک جملهٔ پیوند لازم دارد.
- `Reframe`: قاب‌بندی از دید اپلیکیشن است و باید به دید اپراتور بچرخد.
- `Demote-code`: کد اپلیکیشنی باید به `DeepDive` برود و جای آن کانفیگ/CLI/متریک بیاید.
- `Add-ops-lens`: مفهوم خوب است، ولی بخش «چه چیزی را پایش کنیم و چه زمانی خراب می‌شود» کم دارد.

## قواعد مشترک برای همهٔ درس‌ها

1. مسیر اصلی هر درس باید به این سه سؤال جواب بدهد: این چیز چیست، کجا در
   عملیات به کار می‌آید، و وقتی خراب شد از کجا بفهمیم.
2. کد Java/اپلیکیشنی فقط داخل `DeepDive` با عنوان «برای توسعه‌دهندهٔ
   اپلیکیشن» بماند. مسیر اصلی با کانفیگ، CLI و متریک پیش برود.
3. هر درس Producer/Consumer یک بخش ثابت «عدسی SRE» داشته باشد: متریک‌های
   کلیدی، حالت‌های خرابی و «از تیم اپ چه بپرسیم».
4. «اشتباه‌های رایج» به سوءتنظیم عملیاتی تغییر کند، نه خطای کدنویسی.

## بخش ۱: مقدمه و مفاهیم پایه

| درس | وضعیت | اقدام |
| --- | --- | --- |
| `what-is-kafka` | Reframe | افزودن بلوک «این دوره برای چه کسی است» در ابتدا و تنظیم توقع دربارهٔ کد. |
| `kafka-use-cases` | SRE-ready | بدون تغییر ساختاری؛ یک جمله دربارهٔ بار عملیاتی هر سناریو. |
| `key-terms` | SRE-ready | افزودن یک جمله که Offset/Lag چرا برای اپراتور حیاتی است. |
| `docker-kraft-setup` | SRE-ready | بدون تغییر؛ همین حالا عملیاتی است. |

## بخش ۲: معماری و درون Kafka

| درس | وضعیت | اقدام |
| --- | --- | --- |
| `topics-partitions` | SRE-ready | بدون تغییر ساختاری. |
| `log-segments` | Demote-code | تنها بلوک Java موجود به `DeepDive` منتقل شود؛ CLI و ساختار فایل بماند. |
| `retention-compaction` | SRE-ready | بدون تغییر. |
| `brokers-controller-kraft` | SRE-ready | بدون تغییر. |
| `leader-follower` | SRE-ready | بدون تغییر. |

## بخش ۳: Producer (بیشترین نیاز به بازقاب‌بندی)

| درس | وضعیت | اقدام |
| --- | --- | --- |
| `producer-basics` | Reframe + Demote-code | بازنویسی ops-first انجام شد؛ کد Java به `DeepDive` رفت و بخش «عدسی SRE» و CLI اضافه شد. |
| `producer-partitioner` | Reframe + Demote-code | تمرکز روی اثر Key بر توزیع بار و hotspot؛ کد به `DeepDive`. |
| `producer-acks` | Reframe + Demote-code | تمرکز روی انتخاب acks و دوام؛ جدول تصمیم عملیاتی؛ کد به `DeepDive`. |
| `producer-batching` | Add-ops-lens | مفهوم خوب است؛ متریک‌های batch/linger و اثر بر p99 پررنگ‌تر شود. |
| `producer-idempotence` | Reframe | از «چطور کد بنویسم» به «چرا در تولید duplicate می‌بینم و چطور تشخیص بدهم». |
| `producer-transactions` | Reframe | تمرکز روی هزینهٔ عملیاتی تراکنش و رفتار `read_committed`؛ کد به `DeepDive`. |

## بخش ۴: Consumer و Consumer Groups

| درس | وضعیت | اقدام |
| --- | --- | --- |
| `consumer-poll-loop` | Reframe + Demote-code | بازنویسی ops-first انجام شد؛ کد Java به `DeepDive` و بخش «عدسی SRE» اضافه شد. |
| `consumer-groups` | Reframe | تمرکز روی rebalance، هزینهٔ آن و نشانه‌های flapping؛ کد به `DeepDive`. |
| `consumer-offsets` | Reframe + Demote-code | تمرکز روی commit، offset نامشخص و risk تکرار؛ کد به `DeepDive`. |
| `consumer-delivery-semantics` | Reframe | از دید اپراتور: هر semantic چه خطایی در تولید می‌سازد و چطور تشخیص دهیم. |
| `consumer-lag` | SRE-ready | بدون تغییر ساختاری؛ هستهٔ عملیاتی است. |
| `consumer-assignment` | Add-ops-lens | افزودن اثر استراتژی روی زمان rebalance و پایداری گروه. |

## بخش ۵: Replication و اطمینان‌پذیری

| درس | وضعیت | اقدام |
| --- | --- | --- |
| `replication-isr` | SRE-ready | بدون تغییر. |
| `min-insync-replicas` | SRE-ready | بدون تغییر. |
| `leader-election` | SRE-ready | بدون تغییر. |
| `failure-recovery` | SRE-ready | بدون تغییر. |
| `durability-design` | SRE-ready | بدون تغییر. |

## بخش ۶: Kafka در عمل

| درس | وضعیت | اقدام |
| --- | --- | --- |
| `cli-tools` | SRE-ready | بدون تغییر؛ زبان مادری اپراتور است. |
| `docker-three-node` | SRE-ready | بدون تغییر. |
| `topic-management` | SRE-ready | بدون تغییر. |
| `partition-reassignment` | SRE-ready | بدون تغییر. |
| `kafka-ui-tools` | SRE-ready | بدون تغییر. |

## بخش ۷: اکوسیستم

| درس | وضعیت | اقدام |
| --- | --- | --- |
| `kafka-connect` | Add-ops-lens | افزودن پایش Worker/Task، connector lag و خطاهای رایج عملیاتی. |
| `schema-registry` | Add-ops-lens | افزودن شکست سازگاری schema و اثر آن روی تولید. |
| `kafka-streams` | Reframe | از «چطور Streams بنویسم» به «چطور اپ Streams را اجرا و پایش کنم» (state store، rebalance، restore). |

## بخش ۸: امنیت، پایش و عملیات

| درس | وضعیت | اقدام |
| --- | --- | --- |
| `security` | SRE-ready | بدون تغییر. |
| `monitoring` | SRE-ready | بدون تغییر؛ هستهٔ دوره است. |
| `tuning-capacity` | SRE-ready | بدون تغییر. |
| `troubleshooting` | SRE-ready | بدون تغییر. |
| `upgrades-mirrormaker` | SRE-ready | بدون تغییر. |

## بخش ۹: الگوها و جمع‌بندی

| درس | وضعیت | اقدام |
| --- | --- | --- |
| `architecture-patterns` | Reframe | تمرکز روی پیامد عملیاتی هر الگو (DLQ، retry topic، outbox)؛ کد به `DeepDive`. |
| `topic-design` | SRE-ready | بدون تغییر. |
| `kafka-vs-alternatives` | SRE-ready | بدون تغییر. |
| `interview-questions` | Reframe | سؤال‌ها به سؤال‌های عملیاتی/سناریوی تولید نزدیک شوند. |
| `next-steps` | SRE-ready | بدون تغییر. |

## اولویت اجرا

1. قاب‌بندی سطح دوره و درس اول (مخاطب و نحوهٔ خواندن کد).
2. Producer و Consumer: شش درس Producer و شش درس Consumer طبق ستون «اقدام».
3. اکوسیستم و الگوها: `kafka-streams`، `architecture-patterns`، `interview-questions`.
4. پاس نهایی: یکسان‌سازی عنوان «عدسی SRE» و بررسی پوشش متریک‌ها.
