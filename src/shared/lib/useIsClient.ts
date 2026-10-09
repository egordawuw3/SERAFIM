import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

/**
 * false при пререндере и при гидратации, true — сразу после неё.
 * Для данных, которых нет в готовом HTML (параметры ?color=… в адресе): первый рендер совпадает с HTML,
 * следующий — уже с ними. Без этого React нашёл бы расхождение и перерисовал страницу целиком.
 */
export const useIsClient = () => useSyncExternalStore(subscribe, () => true, () => false)
