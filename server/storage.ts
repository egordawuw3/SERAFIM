import { chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { config } from './config.ts'
import { PERSONAL_DATA_RETENTION_DAYS } from './limits.ts'
import { anonymize, type Order } from './order.ts'

/*
 * Заказы (JSON Lines) для Node/Docker. Персональные данные — только пока заказ не передан в СДЭК и продавцу
 * (потом сохранение той же записи обезличенной копией), у сбойных — не дольше PERSONAL_DATA_RETENTION_DAYS.
 * Доступ к файлу — только у владельца процесса (0600). Запись заменяет строку с тем же номером, а не дописывает
 * вторую: иначе старая строка с именем и телефоном осталась бы в файле.
 */

const FILE_MODE = 0o600
const DIR_MODE = 0o700
const DAY = 24 * 60 * 60 * 1000

/* Запись и чистка идут строго по очереди, иначе одна может затереть изменения другой. */
let queue: Promise<unknown> = Promise.resolve()
const serial = <T>(task: () => Promise<T>): Promise<T> => {
  const run = queue.then(task, task)
  queue = run.catch(() => {})
  return run
}

async function readLines(): Promise<string[]> {
  try {
    return (await readFile(config.ordersFile, 'utf8')).split('\n').filter(Boolean)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw err
  }
}

/** Пишем во временный файл и подменяем атомарно: при сбое посередине исходник не пострадает. */
async function writeLines(lines: string[]): Promise<void> {
  await mkdir(dirname(config.ordersFile), { recursive: true, mode: DIR_MODE })
  const tmp = `${config.ordersFile}.tmp`
  await writeFile(tmp, lines.map((l) => l + '\n').join(''), { encoding: 'utf8', mode: FILE_MODE })
  await rename(tmp, config.ordersFile)
  await chmod(config.ordersFile, FILE_MODE)
}

const numberOf = (line: string): string | undefined => {
  try {
    return (JSON.parse(line) as Partial<Order>).number
  } catch {
    return undefined
  }
}

/** Сохраняет заказ; заказ с тем же номером заменяется (пришёл номер СДЭК, данные обезличены). */
export function saveOrder(order: Order): Promise<void> {
  return serial(async () => {
    const lines = await readLines()
    const json = JSON.stringify(order)
    const i = lines.findIndex((l) => numberOf(l) === order.number)
    if (i >= 0) lines[i] = json
    else lines.push(json)
    await writeLines(lines)
  })
}

/** Заказ по номеру (последняя запись с этим номером). */
export async function findOrder(number: string): Promise<Order | null> {
  const line = (await readLines()).findLast((l) => numberOf(l) === number)
  return line ? (JSON.parse(line) as Order) : null
}

/**
 * Ежедневная чистка: заказы старше retentionDays удаляются, из заказов старше PERSONAL_DATA_RETENTION_DAYS
 * стираются персональные данные. Возвращает, сколько заказов удалено и сколько обезличено.
 */
export function pruneOrders(retentionDays = config.ordersRetentionDays, now = Date.now()): Promise<{ removed: number; anonymized: number }> {
  return serial(async () => {
    const lines = await readLines()
    const cutoff = now - retentionDays * DAY
    const pdCutoff = now - PERSONAL_DATA_RETENTION_DAYS * DAY
    let removed = 0
    let anonymized = 0
    const kept: string[] = []
    for (const line of lines) {
      let order: Order
      try {
        order = JSON.parse(line) as Order
      } catch {
        kept.push(line) // битую строку не трогаем — пусть её разберёт человек
        continue
      }
      const createdAt = Date.parse(order.createdAt ?? '')
      if (!Number.isNaN(createdAt) && createdAt < cutoff) {
        removed++
        continue
      }
      if (!Number.isNaN(createdAt) && createdAt < pdCutoff && !order.personalDataRemovedAt && order.customer) {
        anonymized++
        kept.push(JSON.stringify(anonymize(order, new Date(now))))
        continue
      }
      kept.push(line)
    }
    if (removed || anonymized) await writeLines(kept)
    return { removed, anonymized }
  })
}
