import { useEffect, type RefObject } from 'react'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([tabindex="-1"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Модальный слой: переносит фокус внутрь, не выпускает Tab наружу
 * и возвращает фокус на исходный элемент при закрытии.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const container = ref.current
    if (!container) return
    const previous = document.activeElement as HTMLElement | null
    // Открыли с клавиатуры — вернём фокус «видимым» (рамка, пауза ленты); мышью — тихо, без :focus-visible.
    // Иначе после закрытия по Esc браузер считает ввод клавиатурным, и, например, лента новинок замирает до клика.
    const openedWithKeyboard = previous?.matches(':focus-visible') ?? false
    const focusables = () => [...container.querySelectorAll<HTMLElement>(FOCUSABLE)]
    // Рамка фокуса — только если окно открыли с клавиатуры: у открытых мышью или по таймеру она выглядит как ошибка.
    ;(focusables()[0] ?? container).focus({ preventScroll: true, focusVisible: openedWithKeyboard } as FocusOptions)

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const list = focusables()
      if (!list.length) return
      const first = list[0]
      const last = list[list.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    container.addEventListener('keydown', onKey)
    return () => {
      container.removeEventListener('keydown', onKey)
      previous?.focus({ preventScroll: true, focusVisible: openedWithKeyboard } as FocusOptions)
    }
  }, [ref])
}
