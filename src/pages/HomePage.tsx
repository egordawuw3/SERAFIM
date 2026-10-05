import { useDocumentTitle } from '@/shared/lib/useDocumentTitle'
import { About } from '@/widgets/About'
import { Hero } from '@/widgets/Hero'
import { Marquee } from '@/widgets/Marquee'

export function HomePage() {
  useDocumentTitle()
  return (
    <>
      <Hero />
      <Marquee />
      <About />
    </>
  )
}
