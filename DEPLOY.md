# Выкладка SERAFIM на Cloudflare

Сайт работает на Cloudflare Workers (бесплатный тариф):

- **Готовые страницы, фото и шрифты** Cloudflare отдаёт сам: быстро, без засыпания и без лимитов.
- **Заявки** (`/api/orders`) принимает наш код ([server/worker.ts](server/worker.ts)) и сохраняет в базу **D1**.
- **Раз в сутки** заявки старше 3 лет удаляются автоматически, как обещано в политике конфиденциальности.
- **Каждый `git push`** в рабочую ветку пересобирает и выкладывает сайт сам.

Порядок: **1–5** — сайт на временном адресе `*.workers.dev`, **6–8** — свой домен и боевая версия, **9–11** — безопасность и обслуживание.

---

## 0. Перед началом

- **Двухфакторный вход** (код из приложения: Google Authenticator, 2FAS, Яндекс Ключ) включён в **GitHub**, **Cloudflare** и **REG.RU**. Резервные коды сохранены. Это главная защита: почти все взломы сайтов идут через угнанный аккаунт, а не через код.
- **Актуальный код уже в GitHub** (`git push`).
- **Названия пунктов меню** ниже актуальны на момент написания. Cloudflare иногда переименовывает разделы: если пункта нет, ищите по смыслу или через поиск в панели.

## 1. Аккаунт Cloudflare

1. Зарегистрируйтесь на [dash.cloudflare.com](https://dash.cloudflare.com/sign-up).
2. Включите двухфакторный вход: значок профиля → **Profile → Authentication → Two-Factor Authentication**.

## 2. База заявок D1

1. В панели откройте **Storage & Databases → D1 SQL Database → Create**.
2. Имя — `serafim`, регион оставьте автоматическим и нажмите **Create**.
3. Скопируйте **Database ID** вида `xxxxxxxx-xxxx-…`.
4. Вставьте его в [wrangler.jsonc](wrangler.jsonc) вместо `00000000-0000-0000-0000-000000000000` и сделайте commit и push.

Таблицы создавать не нужно: их создаёт команда выкладки (миграции из папки [migrations/](migrations/)).

## 3. Подключение репозитория (автовыкладка)

1. **Workers & Pages → Create → Import a repository**.
2. Подключите GitHub и дайте доступ **только к репозиторию SERAFIM**, а не ко всем.
3. Выберите репозиторий и заполните:

| Поле | Значение |
|---|---|
| Project name | `serafim` (должно совпадать с `name` в wrangler.jsonc) |
| Production branch | `main` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler d1 migrations apply serafim --remote && npx wrangler deploy` |

4. В **Build variables** добавьте `PREVIEW` = `1`. Пока у сайта временный адрес, он закрыт от поисковиков: `robots.txt` запрещает индексацию, и стоит заголовок `X-Robots-Tag: noindex`.
5. Нажмите **Save and Deploy**. Первая сборка займёт 5–10 минут.

## 4. Уведомления о заявках в Telegram

1. Напишите [@BotFather](https://t.me/BotFather) команду `/newbot` и скопируйте **токен**.
2. Напишите своему боту любое сообщение.
3. Откройте `https://api.telegram.org/bot<ТОКЕН>/getUpdates` и найдите в ответе `"chat":{"id":…}`. Это **chat id**.
4. Добавьте два секрета: Worker **serafim → Settings → Variables and Secrets → Add**, тип **Secret**:
   - `TELEGRAM_BOT_TOKEN` — токен;
   - `TELEGRAM_CHAT_ID` — chat id.

> Токен — это пароль от бота. Его нельзя никому пересылать и вставлять в код. Если он утёк, в @BotFather выполните `/revoke` и обновите секрет.

Без бота заявки всё равно сохраняются в D1, но уведомлений не будет.

## 5. Проверка на временном адресе

1. Откройте адрес из **Workers & Pages → serafim**, вида `serafim.<аккаунт>.workers.dev`.
2. Оформите тестовую заявку. Должно прийти уведомление в Telegram.
3. Проверьте, что заявка сохранилась в базе: **D1 → serafim → Console**:
   ```sql
   SELECT number, created_at, json_extract(data, '$.total') AS total FROM orders ORDER BY created_at DESC LIMIT 10;
   ```

---

## 6. Домен с REG.RU → Cloudflare

Домен остаётся зарегистрирован на REG.RU (там же его продлевать), а **управлять его DNS** будет Cloudflare.

1. В Cloudflare откройте **Add a domain**, введите домен и выберите тариф **Free**.
2. Cloudflare покажет найденные записи DNS. Записи `A` для `@` и `www` от REG.RU (заглушка) можно удалить.
3. Cloudflare выдаст **два NS-сервера** вида `xxx.ns.cloudflare.com`.
4. На REG.RU: **Домены → ваш домен → DNS-серверы и управление зоной → Изменить** → «Свои DNS-серверы» → впишите оба сервера Cloudflare и сохраните.
   - Если на REG.RU был включён **DNSSEC**, сначала выключите его там, иначе домен перестанет открываться.
5. Подождите, пока Cloudflare напишет, что домен активен: обычно 1–2 часа, иногда до суток.

## 7. Домен для сайта

1. Откройте Worker **serafim → Settings → Domains & Routes → Add → Custom domain**:
   - добавьте `домен.ru`;
   - ещё раз добавьте `www.домен.ru`.

   Сертификат HTTPS выпускается сам.
2. Сделайте один адрес вместо двух: **домен → Rules → Redirect Rules → Create from template → «Redirect from WWW to root»** → Deploy. Тогда `www.домен.ru` будет постоянно перенаправлять на `домен.ru`.

## 8. Включение боевой версии

1. В [wrangler.jsonc](wrangler.jsonc):
   - `"SITE_ORIGIN": "https://домен.ru"` — API будет принимать заявки только со своего сайта;
   - `"workers_dev": false` — временный адрес `*.workers.dev` выключится, без дубля сайта.
2. В **Workers & Pages → serafim → Settings → Build → Build variables**:
   - **удалите** `PREVIEW`;
   - добавьте `VITE_SITE_URL` = `https://домен.ru`. С ним появятся canonical, `sitemap.xml` и превью ссылок с картинкой в Telegram и VK.
3. Сделайте commit и push, выкладка пройдёт сама.
4. Проверьте:
   - `https://домен.ru/robots.txt` разрешает индексацию и содержит ссылку на `sitemap.xml`;
   - `https://домен.ru/sitemap.xml` открывается;
   - ссылка на товар, отправленная в Telegram, показывает картинку и цену;
   - тестовая заявка доходит.
5. Добавьте сайт в [Яндекс Вебмастер](https://webmaster.yandex.ru) и [Google Search Console](https://search.google.com/search-console) и отправьте там `sitemap.xml`.

---

## 9. Настройки безопасности в Cloudflare (домен)

| Где | Что | Зачем |
|---|---|---|
| SSL/TLS → Edge Certificates | **Always Use HTTPS**: On | Без случайных заходов по http |
| SSL/TLS → Edge Certificates | **Minimum TLS Version**: 1.2 | Старые небезопасные протоколы отключены |
| SSL/TLS → Edge Certificates | **HSTS**: не включать | Наш сайт уже отдаёт этот заголовок сам |
| Security → WAF → Rate limiting rules | Правило: *URI Path* equals `/api/orders`, не больше ~10 запросов за 10 секунд с одного IP → **Block** | Второй рубеж к нашему лимиту «5 заявок за 10 минут»: флуд режется до кода и не тратит бесплатные лимиты |
| Security → Bots | **Bot Fight Mode**: оставить выключенным | Он может мешать ботам Telegram и VK строить превью ссылок. От спама в форме защищают скрытое поле-ловушка и лимит |
| Analytics → Web Analytics | не включать | В политике сказано, что аналитики нет. К тому же её скрипт заблокирует наш CSP |

**DNS → Records** (почты на домене нет — запрещаем письма «от имени» домена):

| Тип | Имя | Значение |
|---|---|---|
| TXT | `@` | `v=spf1 -all` |
| TXT | `_dmarc` | `v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s` |

**CAA-записи не добавляйте.** Cloudflare выпускает сертификаты через несколько центров (Let's Encrypt, Google и других), и запись «только Let's Encrypt» может сломать HTTPS.

**DNSSEC:** **DNS → Settings → DNSSEC → Enable**. Cloudflare покажет запись DS. Добавьте её на REG.RU в настройках DNSSEC домена: так включается защита от подмены адреса сайта.

## 10. Аккаунты

- **REG.RU:**
  - двухфакторный вход;
  - **автопродление** домена с привязанной картой;
  - **запрет передачи домена** другому регистратору;
  - владелец домена — Серафим как **физическое лицо**.
- **Cloudflare:**
  - двухфакторный вход;
  - Global API Key никому не выдавать;
  - если нужны токены, только с минимальными правами.
- **GitHub:**
  - двухфакторный вход;
  - в Settings → Branches защитить рабочую ветку от удаления и force push.
- **Telegram:** токен бота хранится только в секретах Cloudflare.

## 11. Обслуживание

- **Посмотреть заявки:** D1 → serafim → Console (запрос из шага 5).
- **Резервная копия:** раз в неделю или месяц выполнять `npx wrangler d1 export serafim --remote --output backup-ГГГГ-ММ-ДД.sql`. В файле персональные данные покупателей: не класть его в репозиторий и не пересылать. Восстановить базу на момент из недавнего прошлого можно и в D1 (**Time Travel**), но на бесплатном тарифе история короткая.
- **Откатить неудачную выкладку:** Workers & Pages → serafim → **Deployments** → предыдущая версия → **Rollback**.
- **Логи и ошибки** (например, если Telegram не принял уведомление): serafim → **Observability → Logs**. Имён и телефонов в логах нет, только номера заявок.
- **Бесплатные лимиты:** Workers считает только запросы к API (статика бесплатна), D1 — сотни тысяч записей в день. Для магазина это с огромным запасом. Текущие цифры — в разделе **Workers & Pages → Plans**.

## 12. Запуск заказов через СДЭК (ветка feat/cdek-orders)

**Секреты** — Worker **serafim** → Settings → Variables and Secrets, тип **Secret** (обычный текст стирается при каждой выкладке):

| Имя | Значение |
|---|---|
| `CDEK_CLIENT_ID` | Account из личного кабинета СДЭК → Интеграция |
| `CDEK_CLIENT_SECRET` | Secure password оттуда же |
| `SENDER_PVZ_CODE` | `RZHV3` — ПВЗ, куда Серафим сдаёт посылки |
| `SENDER_NAME` | ФИО отправителя |
| `SENDER_PHONE` | `+79201825311` |
| `TELEGRAM_CHAT_ID` | chat id Серафима (нажать «Старт» у @Serafim_orders_bot, затем getUpdates) |
| `TELEGRAM_BOT_TOKEN` | новый токен после `/revoke` в @BotFather |

**Включение:**
1. В [wrangler.jsonc](wrangler.jsonc) → `vars` добавить `"CDEK_ENV": "prod"` (в основной конфигурации, не в `env.preview`).
2. Слить `feat/cdek-orders` в `main` и запушить — Cloudflare соберёт и выложит сам (5–10 минут, **Deployments**).

**Сразу после выкладки (10 минут, с телефона):**
- главная, карточка, корзина открываются; размер добавляется в корзину;
- оформление: город → пункты на карте → доставка считается (если «Стоимость доставки уточним после оформления» — ключи или `SENDER_PVZ_CODE` неверные, смотреть **Observability → Logs**, строки `[cdek]`);
- **пробный заказ на себя** → пришёл в Telegram с «заказ № …» → появился в кабинете СДЭК → **отменить его в кабинете СДЭК**;
- ссылка на товар, отправленная в Telegram, разворачивается с квадратной картинкой и ценой;
- `https://serafim6s.ru/robots.txt` — без `Disallow: /`, `sitemap.xml` открывается.

**Откат за минуту:** Workers & Pages → serafim → **Deployments** → предыдущая версия → **Rollback**. Сайт сразу возвращается к прошлой версии (база заказов не трогается). Потом спокойно чинить в ветке и выкладывать заново. Через git: `git revert -m 1 <merge-коммит> && git push` — тоже выложится сам.

## 13. Яндекс Вебмастер и Google Search Console

Подтверждение — записью TXT в DNS (Cloudflare → serafim6s.ru → **DNS → Records → Add record**), код сайта не трогаем.

**Яндекс:** [webmaster.yandex.ru](https://webmaster.yandex.ru) → «Добавить сайт» → `https://serafim6s.ru` → способ «DNS-запись» → скопировать значение `yandex-verification: …` → в Cloudflare TXT, Name `@`, Content — это значение → «Проверить». Затем **Индексирование → Файлы Sitemap** → `https://serafim6s.ru/sitemap.xml`; **Регион сайта** — Россия.

**Google:** [search.google.com/search-console](https://search.google.com/search-console) → «Добавить ресурс» → **Доменный ресурс** → `serafim6s.ru` → скопировать `google-site-verification=…` → в Cloudflare TXT, Name `@` → «Подтвердить» (до часа). Затем **Файлы Sitemap** → `sitemap.xml`.

Записи TXT для подтверждения не удалять: без них права на сайт в этих сервисах пропадут.

## Важно: данные покупателей хранятся за границей

D1 — серверы Cloudflare за пределами РФ. По 152-ФЗ первичный сбор и хранение данных граждан РФ должны идти в базах на территории России. Это осознанный временный выбор. Для полного соответствия закону сервер нужно перенести в российское облако (Yandex Cloud, Selectel и т.п.). Код к этому готов: тот же API в Docker ([server/app.ts](server/app.ts), [Dockerfile](Dockerfile)) хранит заявки в файле на своём сервере.

## 14. Остатки по размерам

Остатки — в таблице `stock` базы D1 (стартовые значения — [migrations/0002_stock.sql](migrations/0002_stock.sql), применяются при выкладке). Каждый заказ списывает остаток; на нуле размер на сайте «нет в наличии», под выбранным размером — «Осталось N шт.». Артикулы без строки (рюкзак) не ограничены.

Продавец меняет остатки сам в боте @Serafim_orders_bot (только из своего чата, TELEGRAM_CHAT_ID): /stock — кнопки −1 / +1, или сообщением «The only way M 5», «Salvation XL +3», «Рюкзак 10». Под каждым заказом — «Вернуть на склад» (если посылку не забрали). Бот подключается после выкладки: секрет `TELEGRAM_WEBHOOK_SECRET` в Cloudflare и в `.env.preflight`, затем `npm run bot:setup` (и после каждой смены токена бота).

Вручную:

```sh
# посмотреть
npx wrangler d1 execute serafim --remote --command "SELECT * FROM stock"
# поставить остаток (поступление, отменённый заказ)
npx wrangler d1 execute serafim --remote --command "UPDATE stock SET qty = 5 WHERE sku = 'SRF/HD/ONLYWAY/GREY/M'"
```
