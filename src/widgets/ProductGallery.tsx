import { useEffect, useRef, useState } from 'react'
import { cn } from '@/shared/lib/cn'
import { ChevronLeft, ChevronRight } from '@/shared/ui/icons'

interface Props {
  images: string[]
  alt: string
}

export function ProductGallery({ images, alt }: Props) {
  const [index, setIndex] = useState(0)
  const touchX = useRef<number | null>(null)
  const count = images.length

  // При смене цвета (нового набора фото) возвращаемся к первому кадру.
  const [prevImages, setPrevImages] = useState(images)
  if (prevImages !== images) {
    setPrevImages(images)
    setIndex(0)
  }

  const go = (delta: number) => setIndex((i) => (i + delta + count) % count)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest('select, input, textarea')) return
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + count) % count)
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % count)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [count])

  const arrowCls =
    'absolute top-1/2 z-10 -translate-y-1/2 p-2 text-ink/70 transition-colors hover:text-ink disabled:opacity-0'

  return (
    <div className="flex w-full flex-col">
      <div
        className="relative mx-auto aspect-[4/5] w-full max-w-[640px] select-none"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return
          const dx = e.changedTouches[0].clientX - touchX.current
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
          touchX.current = null
        }}
      >
        {images.map((src, i) => (
          <img
            key={src}
            src={src}
            alt={i === 0 ? alt : `${alt} — фото ${i + 1}`}
            draggable={false}
            className={cn(
              'absolute inset-0 h-full w-full object-contain transition-opacity duration-500',
              i === index ? 'opacity-100' : 'pointer-events-none opacity-0',
            )}
          />
        ))}
        <button type="button" aria-label="Предыдущее фото" className={cn(arrowCls, 'left-0 md:-left-12')} onClick={() => go(-1)} disabled={count < 2}>
          <ChevronLeft className="h-7 w-7" />
        </button>
        <button type="button" aria-label="Следующее фото" className={cn(arrowCls, 'right-0 md:-right-12')} onClick={() => go(1)} disabled={count < 2}>
          <ChevronRight className="h-7 w-7" />
        </button>
      </div>

      <div className="mx-auto mt-6 flex w-full max-w-[640px] gap-2 overflow-x-auto pb-1">
        {images.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Фото ${i + 1}`}
            aria-current={i === index}
            className={cn(
              'h-14 w-12 shrink-0 overflow-hidden border transition-colors md:h-16 md:w-14',
              i === index ? 'border-ink/60' : 'border-transparent opacity-70 hover:opacity-100',
            )}
          >
            <img src={src} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  )
}
