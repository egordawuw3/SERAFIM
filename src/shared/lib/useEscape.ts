import { useEffect, useRef } from 'react'

/*
 * Стек открытых слоёв: Escape закрывает только верхний
 * (например, корзину поверх карточки товара, но не обе сразу).
 */
const stack: { current: () => void }[] = []

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && stack.length) stack[stack.length - 1].current()
}

export function useEscape(handler: () => void, active = true) {
  const ref = useRef(handler)
  useEffect(() => {
    ref.current = handler
  })

  useEffect(() => {
    if (!active) return
    const entry = { current: () => ref.current() }
    if (stack.length === 0) window.addEventListener('keydown', onKeyDown)
    stack.push(entry)
    return () => {
      stack.splice(stack.indexOf(entry), 1)
      if (stack.length === 0) window.removeEventListener('keydown', onKeyDown)
    }
  }, [active])
}
