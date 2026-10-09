/*
 * Заглушка, пока грузится чанк страницы. Появляется с задержкой 300 мс: на быстром соединении
 * её не видно вовсе (нет мигания), на медленном — понятно, что страница грузится, а не сломалась.
 */
export function PageFallback() {
  return (
    <div role="status" className="flex flex-1 items-center justify-center py-32">
      <span className="animate-[fade-in_0.3s_ease-out_0.3s_both] font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
        Загрузка…
      </span>
    </div>
  )
}
