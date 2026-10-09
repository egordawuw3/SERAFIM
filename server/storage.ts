import { appendFile, chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { config } from './config.ts'
import type { Order } from './order.ts'

/*
 * Резервная копия всех заявок (JSON Lines): если Telegram недоступен, заявка не потеряется.
 * В файле персональные данные покупателей, поэтому доступ — только у владельца процесса (0600),
 * а записи старше срока из политики конфиденциальности удаляются (pruneOrders).
 */

const FILE_MODE = 0o600
const DIR_MODE = 0o700

/* Запись и чистка идут строго по очереди, иначе чистка может затереть только что добавленную заявку. */
let queue: Promise<unknown> = Promise.resolve()
const serial = <T>(task: () => Promise<T>): Promise<T> => {
  const run = queue.then(task, task)
  queue = run.catch(() => {})
  return run
}

export function saveOrder(order: Order): Promise<void> {
  return serial(async () => {
    await mkdir(dirname(config.ordersFile), { recursive: true, mode: DIR_MODE })
    await appendFile(config.ordersFile, JSON.stringify(order) + '\n', { encoding: 'utf8', mode: FILE_MODE })
    // mode при appendFile действует только при создании файла — выравниваем права и у старого.
    await chmod(config.ordersFile, FILE_MODE)
  })
}

/** Удаляет заявки старше retentionDays. Возвращает, сколько удалено. */
export function pruneOrders(retentionDays = config.ordersRetentionDays, now = Date.now()): Promise<number> {
  return serial(async () => {
    let text: string
    try {
      text = await readFile(config.ordersFile, 'utf8')
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return 0
      throw err
    }
    const cutoff = now - retentionDays * 24 * 60 * 60 * 1000
    const lines = text.split('\n').filter(Boolean)
    const kept = lines.filter((line) => {
      try {
        const createdAt = Date.parse((JSON.parse(line) as Partial<Order>).createdAt ?? '')
        return Number.isNaN(createdAt) || createdAt >= cutoff
      } catch {
        return true // битую строку не трогаем — пусть её разберёт человек
      }
    })
    const removed = lines.length - kept.length
    if (removed === 0) return 0
    // Пишем во временный файл и подменяем атомарно: при сбое посередине исходник не пострадает.
    const tmp = `${config.ordersFile}.tmp`
    await writeFile(tmp, kept.map((l) => l + '\n').join(''), { encoding: 'utf8', mode: FILE_MODE })
    await rename(tmp, config.ordersFile)
    return removed
  })
}
