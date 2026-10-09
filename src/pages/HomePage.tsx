import { BrandBanner } from '@/widgets/BrandBanner'
import { NewArrivals } from '@/widgets/NewArrivals'
import { CatalogPage } from './CatalogPage'

/* Главная: шапка (в Layout), баннер бренда, лента новинок и сразу каталог. */
export function HomePage() {
  return (
    <>
      <h1 className="sr-only">SERAFIM — одежда, рождённая природой</h1>
      <BrandBanner />
      <NewArrivals />
      <CatalogPage home />
    </>
  )
}
