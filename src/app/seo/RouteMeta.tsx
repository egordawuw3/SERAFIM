import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { headTags, jsonLdText, routeMeta } from './meta'

/*
 * Обновляет <head> при переходах внутри сайта: title, description, canonical, Open Graph, JSON-LD.
 * Теги ищутся по ключу (name/property/rel) и перезаписываются — дублей с тегами из пререндера не будет.
 */
export function RouteMeta() {
  const { pathname } = useLocation()

  useEffect(() => {
    const meta = routeMeta(pathname)
    document.title = meta.title

    const wanted = headTags(meta)
    const managed = new Set(wanted.map((t) => `${t.key}=${t.attrs[t.key]}`))
    for (const t of wanted) {
      const selector = `${t.tag}[${t.key}="${t.attrs[t.key]}"]`
      let el = document.head.querySelector(selector)
      if (!el) {
        el = document.createElement(t.tag)
        document.head.append(el)
      }
      for (const [k, v] of Object.entries(t.attrs)) el.setAttribute(k, v)
    }
    // Убрать теги, которые были у прошлой страницы и не нужны этой (например, product:price на каталоге).
    document.head.querySelectorAll('meta[property^="product:"], link[rel="canonical"], meta[property="og:url"]').forEach((el) => {
      const key = el.hasAttribute('property') ? `property=${el.getAttribute('property')}` : `rel=${el.getAttribute('rel')}`
      if (!managed.has(key)) el.remove()
    })

    let ld = document.getElementById('ld-json')
    if (meta.jsonLd.length) {
      if (!ld) {
        ld = document.createElement('script')
        ld.id = 'ld-json'
        ld.setAttribute('type', 'application/ld+json')
        document.head.append(ld)
      }
      ld.textContent = jsonLdText(meta.jsonLd)
    } else ld?.remove()
  }, [pathname])

  return null
}
