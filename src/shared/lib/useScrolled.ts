import { useSyncExternalStore } from 'react'

const subscribe = (cb: () => void) => {
  window.addEventListener('scroll', cb, { passive: true })
  return () => window.removeEventListener('scroll', cb)
}

/** true, когда страница прокручена дальше порога. Перерисовка — только при смене значения. */
export function useScrolled(threshold = 8): boolean {
  return useSyncExternalStore(subscribe, () => window.scrollY > threshold, () => false)
}
