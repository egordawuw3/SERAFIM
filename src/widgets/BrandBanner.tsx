import { useState } from 'react'
import { site } from '@/shared/config/site'

/*
 * Баннер бренда над лентой новинок: фото природы во всю ширину и поверх — название шрифтом логотипа.
 * Фон: исходник design/hero.jpg (4800 px) → public/images/hero-640/960/1280/1920/2560.webp и hero.jpg (запасной JPEG).
 */
export function BrandBanner() {
  const [photoFailed, setPhotoFailed] = useState(false)

  return (
    <section className="mt-1 w-full px-3 pb-10 md:px-8 md:pb-14">
      <div className="grain relative flex h-[40svh] min-h-[260px] w-full items-center justify-center overflow-hidden rounded-[2px] bg-gradient-to-br from-[#2b3a25] via-[#1c2618] to-[#0f140d] md:h-[52vh]">
        {!photoFailed && (
          <picture>
            <source
              type="image/webp"
              srcSet="/images/hero-640.webp 640w, /images/hero-960.webp 960w, /images/hero-1280.webp 1280w, /images/hero-1920.webp 1920w, /images/hero-2560.webp 2560w"
              sizes="100vw"
            />
            <img
              src="/images/hero.jpg"
              alt=""
              fetchPriority="high"
              onError={() => setPhotoFailed(true)}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </picture>
        )}
        <p
          aria-hidden
          className="relative z-[2] animate-fade-in font-logo text-[clamp(4rem,22vw,14rem)] font-bold uppercase leading-none text-white wordmark [text-shadow:0_2px_30px_rgba(0,0,0,0.35),0_1px_3px_rgba(0,0,0,0.2)]"
        >
          {site.name}
        </p>
      </div>
    </section>
  )
}
