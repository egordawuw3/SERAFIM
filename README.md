# SERAFIM — интернет-магазин

React 19 + TypeScript + Vite + Tailwind CSS 4 + React Router + Zustand.

## Запуск

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # продакшен-сборка в dist/
npm test          # тесты логики корзины
npm run images    # перегенерировать картинки-заглушки товаров
```

Главное фото баннера: положить файл в `public/images/hero-bg.jpg`.

## Страницы

| Путь | Что |
| --- | --- |
| `/` | Баннер → бегущая строка → философия бренда → футер |
| `/catalog` | Каталог, 4 карточки в ряд, фильтр по категориям |
| `/product/:slug` | Карточка товара (из каталога открывается поверх, модальным окном) |
| `/checkout` | Оформление заказа |
| `/info/payment-and-returns`, `/info/documents` | Информация для покупателей |

## Структура `src/`

```
app/        роутинг, layout, глобальные стили
pages/      страницы
widgets/    крупные блоки: шапка, футер, баннер, корзина, карточка товара
features/   корзина (логика + стор с сохранением в localStorage)
entities/   товары и заказы: типы, данные, API
shared/     общие UI-компоненты, хелперы, контакты бренда
```

## Что заменить на реальное

- `src/entities/product/model/catalog.ts` — товары, цены, размеры, наличие; фото в `public/products/`.
- `src/shared/config/site.ts` — ссылки на Telegram, VK, почты (сейчас заглушки).
- `src/pages/InfoPage.tsx` — тексты оферты, политики, реквизиты.
- `src/entities/order/api/orderApi.ts` — сейчас заказ никуда не отправляется. Следующий этап: бэкенд
  (приём заказов, уведомления в Telegram, онлайн-оплата, админка).
