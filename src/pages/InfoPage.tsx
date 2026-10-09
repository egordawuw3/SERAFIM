import { useParams } from 'react-router'
import { site } from '@/shared/config/site'
import { INFO_PAGES } from './legalTexts'
import { NotFoundPage } from './NotFoundPage'

export function InfoPage() {
  const { slug = '' } = useParams()
  const page = INFO_PAGES[slug]
  if (!page) return <NotFoundPage />

  return (
    <section className="w-full px-4 pb-24 pt-8 md:px-12 md:pt-12">
      <div className="mb-12 border-b border-ink/10 pb-6">
        <h1 className="text-3xl font-light uppercase tracking-widest md:text-4xl">{page.title}</h1>
        {page.dated && <p className="mt-3 font-mono text-[11px] text-muted">Редакция от {site.terms.documentsDate}</p>}
      </div>
      <div className="max-w-2xl space-y-12 font-mono text-[13px] leading-relaxed">
        {page.sections.map((s) => (
          <div key={s.title}>
            <h2 className="mb-4 uppercase tracking-[0.12em]">{s.title}</h2>
            <div className="space-y-3 text-ink/70">
              {s.body.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
