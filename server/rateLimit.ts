/**
 * Простой лимит запросов в памяти процесса (фиксированное окно). Достаточно для одного инстанса.
 * maxKeys — потолок памяти: при наплыве запросов с множества адресов вытесняются самые старые записи.
 */
export function createRateLimiter({ max, windowMs, maxKeys = 10_000 }: { max: number; windowMs: number; maxKeys?: number }) {
  const hits = new Map<string, { count: number; resetAt: number }>()

  return function allow(key: string, now = Date.now()): boolean {
    const entry = hits.get(key)
    if (entry && entry.resetAt > now) {
      entry.count++
      return entry.count <= max
    }

    hits.delete(key)
    if (hits.size >= maxKeys) {
      for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k)
      // Map хранит порядок вставки — первые ключи самые старые.
      for (const k of hits.keys()) {
        if (hits.size < maxKeys) break
        hits.delete(k)
      }
    }
    hits.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
}
