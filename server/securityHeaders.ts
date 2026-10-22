/*
 * Заголовки безопасности и кеширования — один источник для обеих площадок:
 * Node-сервер (Docker) ставит их в middleware, а для Cloudflare prerender записывает их в dist/_headers
 * (статику там отдаёт сам Cloudflare, без нашего кода).
 */

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  // 'unsafe-inline' — для style={{…}} (кружки цветов в фильтре).
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  // Плитки карты пунктов выдачи (OpenStreetMap) на странице заказа.
  "img-src 'self' data: https://tile.openstreetmap.org",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

export const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': CSP,
  // Без includeSubDomains: иначе все поддомены клиента обязаны работать по HTTPS.
  'Strict-Transport-Security': 'max-age=15552000',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), usb=(), bluetooth=(), serial=(), hid=()',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Origin-Agent-Cluster': '?1',
  'X-DNS-Prefetch-Control': 'off',
}

/** Бандлы с хешем в имени — навсегда; фото и картинки — сутки, потом фоновая перепроверка без ожидания. */
export const CACHE_RULES: { prefix: string; value: string }[] = [
  { prefix: '/assets/', value: 'public, max-age=31536000, immutable' },
  { prefix: '/products/', value: 'public, max-age=86400, stale-while-revalidate=604800' },
  { prefix: '/images/', value: 'public, max-age=86400, stale-while-revalidate=604800' },
  { prefix: '/fonts/', value: 'public, max-age=2592000, stale-while-revalidate=604800' },
]
