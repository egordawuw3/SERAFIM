import { BrandBanner } from '@/widgets/BrandBanner'
import { Catalog } from '@/widgets/Catalog'
import { NewArrivals } from '@/widgets/NewArrivals'

/* Главная: шапка (в Layout), баннер бренда, лента новинок и сразу каталог. */
export function HomePage() {
  return (
    <>
      <h1 className="sr-only">SERAFIM — одежда, рождённая природой</h1>
      <BrandBanner />
      <NewArrivals />
      <Catalog />
    </>
  )
}
