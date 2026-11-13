import { chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

/*
 * Лист ожидания: кто из покупателей ждёт размер (артикул → id чатов Telegram). Хранится только id чата — до
 * уведомления о поступлении или до отписки (политика конфиденциальности). Node: JSON-файл, как остатки (stockFile.ts).
 */
export interface WaitlistStore {
  /** false — уже ждёт этот размер. */
  add(sku: string, chatId: number): Promise<boolean>
  remove(sku: string, chatId: number): Promise<void>
  /** Кто ждёт — и забыть их: уведомление уходит один раз. */
  take(sku: string): Promise<number[]>
  /** Сколько ждут каждый артикул — для продавца в /stock. */
  counts(): Promise<Record<string, number>>
}

type Lists = Record<string, number[]>

function store(load: () => Promise<Lists>, save: (lists: Lists) => Promise<void>): WaitlistStore {
  let queue: Promise<unknown> = Promise.resolve()
  const serial = <T>(task: () => Promise<T>): Promise<T> => {
    const run = queue.then(task, task)
    queue = run.catch(() => {})
    return run
  }
  return {
    add: (sku, chatId) =>
      serial(async () => {
        const lists = await load()
        const list = (lists[sku] ??= [])
        if (list.includes(chatId)) return false
        list.push(chatId)
        await save(lists)
        return true
      }),
    remove: (sku, chatId) =>
      serial(async () => {
        const lists = await load()
        lists[sku] = (lists[sku] ?? []).filter((id) => id !== chatId)
        if (!lists[sku].length) delete lists[sku]
        await save(lists)
      }),
    take: (sku) =>
      serial(async () => {
        const lists = await load()
        const list = lists[sku] ?? []
        if (list.length) {
          delete lists[sku]
          await save(lists)
        }
        return list
      }),
    counts: () => serial(async () => Object.fromEntries(Object.entries(await load()).map(([sku, ids]) => [sku, ids.length]))),
  }
}

export function memoryWaitlist(): WaitlistStore {
  let lists: Lists = {}
  return store(
    async () => lists,
    async (next) => void (lists = next),
  )
}

export function fileWaitlist(file: string): WaitlistStore {
  return store(
    async () => {
      try {
        return JSON.parse(await readFile(file, 'utf8')) as Lists
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') return {}
        throw err
      }
    },
    async (lists) => {
      await mkdir(dirname(file), { recursive: true, mode: 0o700 })
      await writeFile(`${file}.tmp`, JSON.stringify(lists), { encoding: 'utf8', mode: 0o600 })
      await rename(`${file}.tmp`, file)
      await chmod(file, 0o600)
    },
  )
}
