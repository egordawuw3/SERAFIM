import { useDocumentTitle } from '@/shared/lib/useDocumentTitle'
import { About } from '@/widgets/About'

export function AboutPage() {
  useDocumentTitle('О бренде')
  return <About />
}
