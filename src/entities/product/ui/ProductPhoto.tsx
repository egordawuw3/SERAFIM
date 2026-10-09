import { useState } from 'react'
import { cn } from '@/shared/lib/cn'
import type { ProductImage } from '../model/types'

interface Props {
  image: ProductImage
  alt: string
  /** Какой ширины фото на экране — по нему браузер выбирает файл из srcset. Должен соответствовать вёрстке. */
  sizes: string
  className?: string
  loading?: 'lazy' | 'eager'
  /** high — для фото, которое может стать LCP (первые карточки, главное фото товара). */
  priority?: boolean
}

/*
 * Фото товара: <picture> с AVIF/WebP в нескольких ширинах (у реальных фото), width/height от исходника —
 * браузер заранее знает пропорции и не сдвигает вёрстку. Если файл не загрузился — аккуратная заглушка
 * вместо значка «битой картинки».
 */
export function ProductPhoto({ image, alt, sizes, className, loading = 'lazy', priority = false }: Props) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  if (failedSrc === image.src) {
    return (
      <div role="img" aria-label={alt} className={cn('flex items-center justify-center bg-paper-deep', className)}>
        <span className="px-3 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-ink/70">Фото скоро появится</span>
      </div>
    )
  }

  return (
    <picture>
      {image.sources?.map((s) => <source key={s.type} type={s.type} srcSet={s.srcSet} sizes={sizes} />)}
      <img
        src={image.src}
        alt={alt}
        width={image.width}
        height={image.height}
        loading={priority ? 'eager' : loading}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        draggable={false}
        onError={() => setFailedSrc(image.src)}
        className={className}
      />
    </picture>
  )
}
