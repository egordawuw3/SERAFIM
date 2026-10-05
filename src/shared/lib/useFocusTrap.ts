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
    const focusables = () => [...container.querySelectorAll<HTMLElement>(FOCUSABLE)]
    ;(focusables()[0] ?? container).focus({ preventScroll: true })

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
      previous?.focus({ preventScroll: true })
    }
  }, [ref])
}
