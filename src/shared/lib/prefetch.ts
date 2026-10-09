/*
 * Реестр предзагрузки ленивых чанков. Страницы регистрирует app/App.tsx, а виджеты (карточка товара)
 * вызывают prefetch('product') при наведении — без прямого импорта страниц, слои не смешиваются.
 * Пока пользователь ведёт мышь к карточке, код модалки уже скачивается: клик открывает её без задержки.
 */
type ChunkKey = 'product' | 'cart'

const loaders = new Map<ChunkKey, () => Promise<unknown>>()
const started = new Set<ChunkKey>()

export function registerPrefetch(key: ChunkKey, load: () => Promise<unknown>) {
  loaders.set(key, load)
}

export function prefetch(key: ChunkKey) {
  if (started.has(key)) return
  const load = loaders.get(key)
  if (!load) return
  started.add(key)
  // Ошибка предзагрузки не страшна: настоящая загрузка при открытии попробует ещё раз.
  load().catch(() => started.delete(key))
}
