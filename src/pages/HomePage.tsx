import { useDocumentTitle } from '@/shared/lib/useDocumentTitle'
import { BrandPhilosophy } from '@/widgets/BrandPhilosophy'
import { Hero } from '@/widgets/Hero'
import { Marquee } from '@/widgets/Marquee'

export function HomePage() {
  useDocumentTitle()
  return (
    <>
      <Hero />
      <Marquee />
      <BrandPhilosophy />
    </>
  )
}
