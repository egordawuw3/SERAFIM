import { useEffect, useState } from 'react'
import { useLocation, type Location } from 'react-router'
import { site } from '@/shared/config/site'
import { Close } from '@/shared/ui/icons'

const STORAGE_KEY = 'serafim:tg-popup-closed-at'
const HIDE_FOR_MS = 7 * 24 * 60 * 60 * 1000
const SHOW_AFTER_MS = 15_000

/** Закрывали ли плашку последние 7 дней. Хранилище может быть недоступно (приватный режим) — тогда просто покажем. */
function recentlyClosed(): boolean {
  try {
    const at = Number(localStorage.getItem(STORAGE_KEY))
    return Number.isFinite(at) && Date.now() - at < HIDE_FOR_MS
  } catch {
    return false
  }
}

function rememberClosed() {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()))
  } catch {
    // Без хранилища плашка покажется снова при следующем заходе — не страшно.
  }
}

/*
 * Плашка «Подпишись на Telegram-канал»: через 15 с или когда долистали до середины страницы. Закрывается крестиком,
 * после закрытия (или перехода в канал) не показывается 7 дней. Не появляется там, где мешала бы заказу:
 * оформление, страница и окно товара (у кнопки «Оформить заказ»).
 */
export function TelegramPopup() {
  const location = useLocation()
  const [ready, setReady] = useState(false)
  const [closed, setClosed] = useState(true)

  // После гидратации: в готовом HTML плашки нет, о прошлом закрытии знает только браузер.
  useEffect(() => {
    if (recentlyClosed()) return
    const show = () => {
      setClosed(false)
      setReady(true)
    }
    const timer = setTimeout(show, SHOW_AFTER_MS)
    const onScroll = () => {
      const half = (document.documentElement.scrollHeight - window.innerHeight) / 2
      if (half > 0 && window.scrollY >= half) show()
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      clearTimeout(timer)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  const modalOpen = Boolean((location.state as { background?: Location } | null)?.background)
  const busyRoute = location.pathname.startsWith('/checkout') || location.pathname.startsWith('/product/')
  if (!ready || closed || modalOpen || busyRoute) return null

  const close = () => {
    rememberClosed()
    setClosed(true)
  }

  return (
    <aside
      aria-label="Telegram-канал SERAFIM"
      className="fixed inset-x-3 bottom-3 z-40 rounded-lg bg-ink p-4 pr-11 font-mono text-[12px] leading-relaxed text-paper shadow-lg motion-safe:animate-fade-in sm:inset-x-auto sm:bottom-6 sm:left-6 sm:max-w-[340px]"
    >
      <p>Подпишись на наш Telegram-канал, чтобы быть в курсе новых дропов</p>
      <a
        href={site.contacts.telegramChannel}
        target="_blank"
        rel="noreferrer"
        onClick={close}
        className="mt-3 inline-flex h-9 items-center rounded-lg bg-paper px-4 uppercase tracking-[0.12em] text-ink transition-opacity hover:opacity-85"
      >
        Открыть канал
      </a>
      <button
        type="button"
        onClick={close}
        aria-label="Закрыть"
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg text-paper/80 transition-colors hover:text-paper"
      >
        <Close className="h-4 w-4" />
      </button>
    </aside>
  )
}
