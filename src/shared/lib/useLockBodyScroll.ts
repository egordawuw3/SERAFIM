import { useEffect } from 'react'

let locks = 0

/** Блокирует прокрутку страницы, пока открыт модальный слой. Поддерживает вложенность. */
export function useLockBodyScroll(active = true) {
  useEffect(() => {
    if (!active) return
    locks++
    const { body, documentElement } = document
    const scrollbar = window.innerWidth - documentElement.clientWidth
    if (locks === 1) {
      body.style.overflow = 'hidden'
      body.style.paddingRight = `${scrollbar}px`
    }
    return () => {
      locks--
      if (locks === 0) {
        body.style.overflow = ''
        body.style.paddingRight = ''
      }
    }
  }, [active])
}
