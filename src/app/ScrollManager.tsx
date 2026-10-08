import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'

/*
 * Прокрутка вверх при переходе между страницами и к якорю (#about) при его наличии.
 * backgroundPath — страница под открытой карточкой товара: пока карточка открыта и когда её закрывают,
 * эта страница остаётся на своём месте прокрутки.
 */
export function ScrollManager({ backgroundPath }: { backgroundPath?: string }) {
  const { pathname, hash, key } = useLocation()
  const underModal = useRef<string | undefined>(undefined)
  // Повторный клик по «О бренде» должен снова докрутить до раздела, а смена фильтров каталога — не дёргать скролл.
  const hashKey = hash ? key : null

  useEffect(() => {
    if (backgroundPath) {
      underModal.current = backgroundPath
      return
    }
    const closingModal = underModal.current === pathname
    underModal.current = undefined
    if (closingModal) return
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
      return
    }
    window.scrollTo(0, 0)
  }, [pathname, hash, hashKey, backgroundPath])

  return null
}
