/**
 * Данные из D1 (Cloudflare) для Node-сервера: заказы → orders.jsonl, остатки → stock.json.
 *   node scripts/import-d1.ts <папка>
 * В заказах могут быть персональные данные (не переданные продавцу, до 30 дней) — файлы только для владельца (0600),
 * после переноса на сервер локальную папку удалить.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const out = process.argv[2]
if (!out) {
  console.error('Укажите папку: node scripts/import-d1.ts <папка>')
  process.exit(1)
}

function query<T>(sql: string): T[] {
  const raw = execFileSync('npx', ['wrangler', 'd1', 'execute', 'serafim', '--remote', '--json', '--command', sql], { encoding: 'utf8' })
  return (JSON.parse(raw) as { results: T[] }[])[0].results
}

mkdirSync(out, { recursive: true, mode: 0o700 })
const orders = query<{ data: string }>('SELECT data FROM orders ORDER BY created_at')
writeFileSync(join(out, 'orders.jsonl'), orders.map((o) => JSON.stringify(JSON.parse(o.data)) + '\n').join(''), { mode: 0o600 })
const stock = query<{ sku: string; qty: number }>('SELECT sku, qty FROM stock ORDER BY sku')
writeFileSync(join(out, 'stock.json'), JSON.stringify(Object.fromEntries(stock.map((s) => [s.sku, s.qty])), null, 2), { mode: 0o600 })
console.log(`заказов: ${orders.length}, артикулов с остатком: ${stock.length} → ${out}`)
