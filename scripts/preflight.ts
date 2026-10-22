/*
 * Проверка перед выкладкой на боевой домен: npm run preflight. Печатает ✓/✗ по каждому пункту; если есть ✗ —
 * выход с кодом 1, в main не сливать.
 *
 * Значения секретов Cloudflare не отдаёт (только имена), поэтому проверки «ключи СДЭК работают» и «бот пишет в чат»
 * берут значения из локального файла .env.preflight (в git не попадает) — те же, что заданы в Cloudflare:
 *   CDEK_CLIENT_ID=…  CDEK_CLIENT_SECRET=…  SENDER_PVZ_CODE=RZHV3  TELEGRAM_BOT_TOKEN=…  TELEGRAM_CHAT_ID=…
 * Значения нигде не печатаются.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { site } from '../src/shared/config/site.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DOMAIN = 'serafim6s.ru'
const ORIGIN = `https://${DOMAIN}`
const REQUIRED_SECRETS = ['CDEK_CLIENT_ID', 'CDEK_CLIENT_SECRET', 'SENDER_PVZ_CODE', 'SENDER_NAME', 'SENDER_PHONE', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID']
const CDEK = 'https://api.cdek.ru/v2'

const results: { ok: boolean; name: string; detail: string; who?: string }[] = []
const check = (ok: boolean, name: string, detail = '', who?: string) => {
  results.push({ ok, name, detail, who })
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`)
}
const env = process.env

// ---------- 1. Секреты боевого Worker (только имена) ----------
let secretNames: string[] = []
try {
  const out = execFileSync('npx', ['wrangler', 'secret', 'list'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  secretNames = (JSON.parse(out.slice(out.indexOf('['))) as { name: string }[]).map((s) => s.name)
} catch {
  check(false, 'wrangler secret list', 'не удалось получить список (нужен вход: npx wrangler login)', 'я')
}
for (const name of REQUIRED_SECRETS) {
  const who = name.startsWith('CDEK') ? 'клиент даёт ключи из кабинета СДЭК, ты вставляешь' : name.startsWith('SENDER') ? 'ты (данные от клиента)' : 'ты (токен — после /revoke, chat id — после «Старт» у бота)'
  check(secretNames.includes(name), `секрет ${name} задан в Cloudflare`, '', who)
}
const conf = readFileSync(join(ROOT, 'wrangler.jsonc'), 'utf8')
const mainVars = conf.slice(conf.indexOf('"vars"'), conf.indexOf('"env"'))
// Не проверка, а справка: CDEK_ENV=prod включается на шаге релиза, после того как preflight весь ✓.
console.log(`· CDEK_ENV в боевой конфигурации: ${/"CDEK_ENV":\s*"prod"/.test(mainVars) ? 'prod' : 'не включён (включается при релизе)'}`)

// ---------- 2. Боевой СДЭК ----------
const local = (k: string) => env[k]?.trim() ?? ''
async function cdekToken(): Promise<string | null> {
  if (!local('CDEK_CLIENT_ID') || !local('CDEK_CLIENT_SECRET')) return null
  const res = await fetch(`${CDEK}/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: local('CDEK_CLIENT_ID'), client_secret: local('CDEK_CLIENT_SECRET') }),
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null)
  const data = (await res?.json().catch(() => ({}))) as { access_token?: string }
  return data.access_token ?? ''
}
const token = await cdekToken()
if (token === null) {
  check(false, 'боевые ключи СДЭК проходят OAuth', 'нет значений в .env.preflight', 'ты')
} else {
  check(Boolean(token), 'боевые ключи СДЭК проходят OAuth', token ? '' : 'СДЭК отклонил ключи', 'клиент (кабинет СДЭК → Интеграция)')
}
if (token) {
  const auth = { authorization: `Bearer ${token}` }
  const pvz = local('SENDER_PVZ_CODE') || 'RZHV3'
  const points = (await fetch(`${CDEK}/deliverypoints?code=${encodeURIComponent(pvz)}`, { headers: auth }).then((r) => r.json()).catch(() => [])) as {
    is_reception?: boolean
    location?: { city_code: number; address_full?: string }
  }[]
  const point = points[0]
  check(Boolean(point), `ПВЗ отправителя ${pvz} существует`, point?.location?.address_full ?? 'не найден', 'клиент (код ПВЗ, куда сдаёт посылки)')
  check(point?.is_reception === true, `ПВЗ ${pvz} принимает отправления`, '', 'клиент')
  for (const [city, code] of [['Москва', 44], ['Казань', 424]] as const) {
    const q = (await fetch(`${CDEK}/calculator/tariff`, {
      method: 'POST',
      headers: { ...auth, 'content-type': 'application/json' },
      body: JSON.stringify({ tariff_code: 136, from_location: { code: point?.location?.city_code ?? 0 }, to_location: { code }, packages: [{ weight: 600, length: 30, width: 25, height: 8 }] }),
    })
      .then((r) => r.json())
      .catch(() => ({}))) as { total_sum?: number; period_min?: number; period_max?: number }
    check(q.total_sum !== undefined, `расчёт доставки ${pvz} → ${city}`, q.total_sum !== undefined ? `${Math.ceil(q.total_sum)} ₽, ${q.period_min}–${q.period_max} дн.` : 'не рассчитан', 'клиент (договор СДЭК)')
  }
}

// ---------- 3. Telegram ----------
if (local('TELEGRAM_BOT_TOKEN') && local('TELEGRAM_CHAT_ID')) {
  const res = await fetch(`https://api.telegram.org/bot${local('TELEGRAM_BOT_TOKEN')}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: local('TELEGRAM_CHAT_ID'), text: 'Проверка связи с сайтом' }),
  }).catch(() => null)
  check(Boolean(res?.ok), 'бот пишет в TELEGRAM_CHAT_ID («Проверка связи с сайтом»)', res?.ok ? '' : `ответ ${res?.status ?? 'нет'}`, 'ты')
} else {
  check(false, 'бот пишет в TELEGRAM_CHAT_ID', 'нет значений в .env.preflight', 'ты')
}

// ---------- 4. Продавец ----------
check(Boolean(site.seller.name.trim()), 'ФИО продавца заполнено', site.seller.name)
check(/^\d{12}$/.test(site.seller.inn), 'ИНН продавца заполнен (12 цифр)', site.seller.inn)

// ---------- 5. Домен ----------
const ns = spawnSync('dig', ['+short', 'NS', DOMAIN], { encoding: 'utf8' }).stdout.trim()
check(/cloudflare\.com/.test(ns), 'домен на DNS-серверах Cloudflare', ns.replaceAll('\n', ', '))
const home = await fetch(ORIGIN, { redirect: 'manual', signal: AbortSignal.timeout(15_000) }).catch((e: Error) => e)
check(!(home instanceof Error) && home.ok, 'HTTPS валиден, сайт отвечает', home instanceof Error ? home.message : `${home.status}, ${home.headers.get('server') ?? ''}`)
const whois = spawnSync('whois', ['-h', 'whois.tcinet.ru', DOMAIN], { encoding: 'utf8' }).stdout
const state = /state:\s*(.+)/.exec(whois)?.[1]?.trim() ?? 'нет данных'
check(!state.includes('UNVERIFIED'), 'домен подтверждён в реестре .ru', state, 'клиент (REG.RU → подтвердить данные владельца)')

// ---------- 6. Боевая сборка ----------
const build = spawnSync('npm', ['run', 'build'], { cwd: ROOT, encoding: 'utf8', env: { ...env, PREVIEW: '' } })
check(build.status === 0, 'боевая сборка собирается', build.status === 0 ? '' : build.stderr.slice(-200))
const dist = (p: string) => (existsSync(join(ROOT, 'dist', p)) ? readFileSync(join(ROOT, 'dist', p), 'utf8') : '')
const robots = dist('robots.txt')
check(!/Disallow: \/\s*$/m.test(robots) && robots.includes(`Sitemap: ${ORIGIN}/sitemap.xml`), 'robots.txt разрешает индексацию и ведёт на sitemap')
const sitemap = dist('sitemap.xml')
check((sitemap.match(new RegExp(`<loc>${ORIGIN}`, 'g')) ?? []).length >= 10, 'sitemap.xml со страницами на боевом домене', `${(sitemap.match(/<loc>/g) ?? []).length} адресов`)
check(!/X-Robots-Tag/i.test(dist('_headers')), 'нет X-Robots-Tag: noindex в заголовках')
const indexHtml = dist('index.html')
check(indexHtml.includes(`rel="canonical" href="${ORIGIN}/"`) && indexHtml.includes('index, follow'), 'главная: canonical на serafim6s.ru, index, follow')
const productHtml = dist('product/the-only-way-hoodie/index.html')
check(productHtml.includes(`${ORIGIN}/products/the-only-way-hoodie/grey-og.jpg`) && productHtml.includes('og:image:width'), 'карточка: превью ссылки (og:image 1200×1200)')

const failed = results.filter((r) => !r.ok)
console.log(`\n${failed.length ? `✗ ${failed.length} из ${results.length} — СТОП, в main не сливать` : `✓ все ${results.length} проверок пройдены — можно выкатывать`}`)
for (const f of failed) if (f.who) console.log(`  • ${f.name} → ${f.who}`)
process.exit(failed.length ? 1 : 0)
