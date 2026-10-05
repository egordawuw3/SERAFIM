require('dotenv').config();

const path = require('path');

const ROOT = path.join(__dirname, '..');

module.exports = {
  root: ROOT,
  port: Number(process.env.PORT) || 3000,
  baseUrl: (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, ''),
  dataDir: process.env.DATA_DIR || path.join(ROOT, 'data'),
  uploadsDir: path.join(ROOT, 'public', 'uploads'),

  adminPassword: process.env.ADMIN_PASSWORD || '',
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret-change-me',

  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
  },

  yookassa: {
    shopId: process.env.YOOKASSA_SHOP_ID || '',
    secretKey: process.env.YOOKASSA_SECRET_KEY || '',
    sendReceipt: process.env.YOOKASSA_SEND_RECEIPT === '1',
    vatCode: Number(process.env.YOOKASSA_VAT_CODE) || 1,
  },

  currency: 'RUB',

  // Способы доставки. Цены в рублях. freeFrom — порог бесплатной доставки (null — нет).
  delivery: [
    { id: 'cdek_pvz', name: 'СДЭК — пункт выдачи', price: 450, freeFrom: 15000, needsAddress: true, hint: 'Адрес или код пункта выдачи СДЭК' },
    { id: 'cdek_courier', name: 'СДЭК — курьер до двери', price: 750, freeFrom: 25000, needsAddress: true, hint: 'Улица, дом, квартира' },
    { id: 'post', name: 'Почта России', price: 400, freeFrom: 15000, needsAddress: true, hint: 'Адрес и индекс' },
    { id: 'pickup', name: 'Самовывоз (Москва, по договорённости)', price: 0, freeFrom: null, needsAddress: false, hint: '' },
  ],

  orderStatuses: {
    new: 'Новый',
    awaiting_payment: 'Ожидает оплаты',
    paid: 'Оплачен',
    processing: 'Собирается',
    shipped: 'Отправлен',
    completed: 'Выполнен',
    cancelled: 'Отменён',
  },
};

module.exports.yookassaEnabled = () =>
  Boolean(module.exports.yookassa.shopId && module.exports.yookassa.secretKey);
