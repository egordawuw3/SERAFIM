import { chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { StockLine, StockResult, StockStore } from './stock.ts'

/*
 * Остатки для Node/Docker: JSON-файл { "SKU/размер": штук }. Как и заказы (storage.ts) — запись во временный файл
 * и атомарная подмена, все операции строго по очереди: двух последних штук двум покупателям не продать.
 * Нет файла — остатки не ведутся (ничего не ограничено); стартовые цифры кладёт scripts/import-d1.ts.
 */
export function fileStock(file: string): StockStore {
  let queue: Promise<unknown> = Promise.resolve()
  const serial = <T>(task: () => Promise<T>): Promise<T> => {
    const run = queue.then(task, task)
    queue = run.catch(() => {})
    return run
  }

  const read = async (): Promise<Record<string, number>> => {
    try {
      return JSON.parse(await readFile(file, 'utf8')) as Record<string, number>
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return {}
      throw err
    }
  }
  const write = async (left: Record<string, number>) => {
    await mkdir(dirname(file), { recursive: true, mode: 0o700 })
    await writeFile(`${file}.tmp`, JSON.stringify(left, null, 2), { encoding: 'utf8', mode: 0o600 })
    await rename(`${file}.tmp`, file)
    await chmod(file, 0o600)
  }

  return {
    stock: () => serial(read),
    takeStock: (lines: StockLine[]) =>
      serial(async (): Promise<StockResult> => {
        const left = await read()
        for (const l of lines) {
          if (l.sku in left && left[l.sku] < l.qty) return { ok: false, sku: l.sku, left: left[l.sku] }
        }
        const after: Record<string, number> = {}
        for (const l of lines) if (l.sku in left) after[l.sku] = left[l.sku] -= l.qty
        if (Object.keys(after).length) await write(left)
        return { ok: true, left: after }
      }),
    setStock: (sku, change) =>
      serial(async () => {
        const left = await read()
        left[sku] = Math.max(0, 'qty' in change ? change.qty : (left[sku] ?? 0) + change.delta)
        await write(left)
        return left[sku]
      }),
  }
}
