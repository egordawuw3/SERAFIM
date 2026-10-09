import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { App } from '@/app/App'
// Шрифты — со своего сервера, а не с Google Fonts: IP посетителей не уходит третьим лицам.
import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
import '@/app/styles.css'

const app = (
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)

// В продакшене страница приходит готовым HTML из сборки (scripts/prerender.ts) — «оживляем» его, а не рисуем заново.
// В режиме разработки (npm run dev) HTML пустой — обычный клиентский рендер.
const root = document.getElementById('root')!
if (root.hasChildNodes()) hydrateRoot(root, app)
else createRoot(root).render(app)
