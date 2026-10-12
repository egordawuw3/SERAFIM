import { Navigate, useLocation } from 'react-router'

/* /catalog?color=… → /?color=…#catalog: фильтры из старой ссылки сохраняются. На сервере тот же переход — 301. */
export function CatalogRedirect() {
  const { search } = useLocation()
  return <Navigate to={{ pathname: '/', search, hash: '#catalog' }} replace />
}
