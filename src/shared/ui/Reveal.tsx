import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

interface Props {
  children: ReactNode
  className?: string
  /** Задержка появления в мс — для «лесенки» из нескольких блоков. */
  delay?: number
}

/* Блок плавно проявляется, когда доходит до экрана. Один раз, без повторов при обратной прокрутке. */
export function Reveal({ children, className, delay = 0 }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const show = () => el.setAttribute('data-shown', '')
    if (!('IntersectionObserver' in window)) return show()
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        show()
        io.disconnect()
      },
      { rootMargin: '0px 0px -10% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={ref} className={cn('reveal', className)} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </div>
  )
}
