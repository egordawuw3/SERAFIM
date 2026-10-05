import { useEffect } from 'react'
import { useLocation } from 'react-router'

/* Прокрутка вверх при переходе между страницами и к якорю (#philosophy) при его наличии. */
export function ScrollManager({ skip }: { skip: boolean }) {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (skip) return
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
      return
    }
    window.scrollTo(0, 0)
  }, [pathname, hash, skip])

  return null
}
