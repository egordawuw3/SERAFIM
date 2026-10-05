const WORDS = ['Чистая природа', 'Органические красители', 'Лимитированный тираж', 'Рождено землёй', 'Свет сквозь листву']

export function Marquee() {
  const row = [...WORDS, ...WORDS]
  return (
    <div className="relative flex w-full items-center overflow-hidden border-y border-ink/10 bg-paper py-4">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-paper to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-paper to-transparent" />
      <div className="flex animate-marquee whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.35em] text-ink/30" aria-hidden>
        {[0, 1].map((copy) => (
          <div key={copy} className="flex items-center">
            {row.map((w, i) => (
              <span key={i} className={i % 2 ? 'mx-8 text-ink/75' : 'mx-8'}>
                ✦ {w}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
