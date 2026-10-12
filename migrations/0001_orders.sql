-- Заявки: полный JSON заявки (как строка в data/orders.jsonl у Node-сервера) + поля для поиска и чистки.
CREATE TABLE orders (
  number TEXT PRIMARY KEY,
  created_at TEXT NOT NULL, -- ISO 8601: строки сравниваются в порядке времени
  data TEXT NOT NULL
);
CREATE INDEX orders_created_at ON orders (created_at);

-- Лимит заявок с одного IP (фиксированное окно).
CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  reset_at INTEGER NOT NULL -- мс с 1970
);
