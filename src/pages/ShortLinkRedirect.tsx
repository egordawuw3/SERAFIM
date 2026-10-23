import { Navigate, useParams, useSearchParams } from 'react-router'
import { shortLinkTarget } from '@/entities/product/lib/shortLink'

/*
 * Короткая ссылка для переписки: /p/<id или slug>?size=M&order=1. С сервера она сразу отвечает редиректом
 * (server/api.ts) — этот маршрут нужен для переходов внутри уже открытого сайта.
 */
export function ShortLinkRedirect() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  return <Navigate to={shortLinkTarget(id, params)} replace />
}
