import { useEffect, useId, useRef, useState } from 'react'
import { useLocation, type Location } from 'react-router'
import { site } from '@/shared/config/site'
import { useEscape } from '@/shared/lib/useEscape'
import { useFocusTrap } from '@/shared/lib/useFocusTrap'
import { useLockBodyScroll } from '@/shared/lib/useLockBodyScroll'
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
 * Окно «Подпишись на Telegram-канал»: через 15 с или когда долистали до середины страницы. Закрывается крестиком,
 * «Не сейчас», Esc или кликом мимо; после закрытия (или перехода в канал) не показывается 7 дней. Не появляется там,
 * где мешало бы заказу: оформление, страница и окно товара.
 */
export function TelegramPopup() {
  const location = useLocation()
  const [ready, setReady] = useState(false)
  const [closed, setClosed] = useState(true)

  // После гидратации: в готовом HTML плашки нет, о прошлом закрытии знает только браузер.
  useEffect(() => {
    if (recentlyClosed()) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const stop = () => {
      clearTimeout(timer)
      window.removeEventListener('scroll', onScroll)
    }
    // Показываем один раз за визит: после этого таймер и слежение за прокруткой снимаются, иначе прокрутка
    // после закрытия (в том числе та, что браузер шлёт при разблокировке страницы) открывала окно снова.
    const show = () => {
      stop()
      if (recentlyClosed()) return
      setClosed(false)
      setReady(true)
    }
    function onScroll() {
      const half = (document.documentElement.scrollHeight - window.innerHeight) / 2
      if (half > 0 && window.scrollY >= half) show()
    }
    timer = setTimeout(show, SHOW_AFTER_MS)
    window.addEventListener('scroll', onScroll, { passive: true })
    return stop
  }, [])

  const modalOpen = Boolean((location.state as { background?: Location } | null)?.background)
  const busyRoute = location.pathname.startsWith('/checkout') || location.pathname.startsWith('/product/')
  if (!ready || closed || modalOpen || busyRoute) return null

  const close = () => {
    rememberClosed()
    setClosed(true)
  }

  return <TelegramDialog onClose={close} />
}

/*
 * Окно по центру экрана: сверху лес из баннера с логотипом, ниже предложение подписаться. Как у карточки товара:
 * затемнение и клик мимо окна, Esc, фокус удерживается внутри, страница под окном не прокручивается.
 */
function TelegramDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useEscape(onClose)
  useLockBodyScroll()
  useFocusTrap(ref)

  return (
    <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 animate-fade-in bg-[#0d1110]/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[380px] animate-sheet-in overflow-hidden rounded-lg bg-paper shadow-2xl">
        <div className="grain relative flex h-36 items-center justify-center overflow-hidden bg-forest sm:h-40">
          <img
            src="/images/hero-640.webp"
            srcSet="/images/hero-640.webp 640w, /images/hero-960.webp 960w"
            sizes="380px"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <span
            aria-hidden
            className="wordmark relative z-[2] font-logo text-[3.4rem] font-bold uppercase leading-none text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.35)]"
          >
            {site.name}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="absolute right-2 top-2 z-[3] flex h-9 w-9 items-center justify-center rounded-lg text-white/90 transition-colors hover:text-white"
          >
            <Close className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 pb-6 pt-5 text-center font-mono">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Telegram-канал</p>
          <h2 id={titleId} className="mt-3 font-sans text-[20px] font-light leading-snug text-ink">
            Подпишись на наш Telegram-канал, чтобы быть в курсе новых дропов
          </h2>
          <a
            href={site.contacts.telegramChannel}
            target="_blank"
            rel="noreferrer"
            onClick={onClose}
            className="mt-6 flex h-12 w-full items-center justify-center rounded-lg bg-ink text-[12px] uppercase tracking-[0.15em] text-paper transition-opacity hover:opacity-85"
          >
            Подписаться
          </a>
          <button type="button" onClick={onClose} className="link-hover mt-4 text-[11px] text-ink/70 transition-colors hover:text-ink">
            Не сейчас
          </button>
        </div>
      </div>
    </div>
  )
}
